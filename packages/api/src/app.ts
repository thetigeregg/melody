import cors from "@fastify/cors";
import Fastify from "fastify";
import { createDb, createLogger, getEnv, healthcheck, upsertJobState } from "@melody/shared";
import { generateRecommendations } from "@melody/worker";
import { z } from "zod";

const recommendationRequestSchema = z.object({
  useCache: z.boolean().optional(),
  config: z.object({
    externalRatio: z.number().min(0).max(1).optional(),
    localRatio: z.number().min(0).max(1).optional(),
    limit: z.number().int().min(1).max(100).optional(),
    includeExplanations: z.boolean().optional()
  }).optional()
});

const exploreRequestSchema = z.object({
  prompt: z.string().min(1),
  config: recommendationRequestSchema.shape.config.optional()
});

const scheduleSchema = z.object({
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  cronExpression: z.string().min(1),
  timezone: z.string().default("Europe/Zurich"),
  channelType: z.literal("discord_webhook"),
  channelConfig: z.object({
    webhookUrl: z.string()
  }),
  scheduleConfig: z.record(z.string(), z.unknown())
});

export function buildApp() {
  const env = getEnv();
  const app = Fastify({
    loggerInstance: createLogger("api")
  });

  app.register(cors, {
    origin: true
  });

  app.get("/health", async () => {
    await healthcheck();
    return { ok: true };
  });

  app.get("/config", async () => ({
    timezone: env.TZ,
    defaultRecommendationExternalRatio: env.DEFAULT_RECOMMENDATION_EXTERNAL_RATIO,
    defaultRecommendationRediscoveryRatio: env.DEFAULT_RECOMMENDATION_REDISCOVERY_RATIO,
    defaultNotificationTimezone: env.DEFAULT_NOTIFICATION_TIMEZONE,
    tagScanConcurrency: env.TAG_SCAN_CONCURRENCY
  }));

  app.put("/config", async () => ({
    persisted: false,
    message: "Runtime config persistence is not implemented yet. Use environment variables for now."
  }));

  app.get("/scan/status", async () => {
    const db = createDb();
    const latest = await db
      .selectFrom("scan_runs")
      .selectAll()
      .orderBy("started_at", "desc")
      .executeTakeFirst();

    return latest ?? null;
  });

  app.post("/scan", async () => {
    await upsertJobState("scan-library-trigger", {
      requestedAt: new Date().toISOString(),
      status: "pending"
    });

    return {
      accepted: true,
      mode: "incremental"
    };
  });

  app.get("/recommendations/latest", async () => {
    const db = createDb();
    const run = await db
      .selectFrom("recommendation_runs")
      .selectAll()
      .where("status", "=", "completed")
      .orderBy("created_at", "desc")
      .executeTakeFirst();

    if (!run) {
      return null;
    }

    const items = await db
      .selectFrom("recommendation_items")
      .selectAll()
      .where("recommendation_run_id", "=", run.id)
      .orderBy("rank", "asc")
      .execute();

    return {
      run,
      items
    };
  });

  app.post("/recommendations/run", async (request) => {
    const payload = recommendationRequestSchema.parse(request.body);
    return generateRecommendations("manual", payload.config);
  });

  app.post("/recommendations/explore", async (request) => {
    const payload = exploreRequestSchema.parse(request.body);
    return generateRecommendations("prompt", payload.config, payload.prompt);
  });

  app.get("/artists", async (request) => {
    const db = createDb();
    const query = z.object({ q: z.string().optional() }).parse(request.query);
    let builder = db
      .selectFrom("canonical_artists")
      .selectAll()
      .orderBy("canonical_name", "asc")
      .limit(100);

    if (query.q) {
      builder = builder.where("canonical_name", "ilike", `%${query.q}%`);
    }

    return builder.execute();
  });

  app.get("/artists/:id", async (request) => {
    const db = createDb();
    const params = z.object({ id: z.string() }).parse(request.params);
    const artist = await db
      .selectFrom("canonical_artists")
      .selectAll()
      .where("id", "=", params.id)
      .executeTakeFirst();

    const tracks = await db
      .selectFrom("tracks")
      .selectAll()
      .where("canonical_album_artist_id", "=", params.id)
      .limit(50)
      .execute();

    return { artist, tracks };
  });

  app.get("/artists/:id/similar", async (request) => {
    const db = createDb();
    const params = z.object({ id: z.string() }).parse(request.params);
    return db
      .selectFrom("artist_similarity")
      .selectAll()
      .where("from_canonical_artist_id", "=", params.id)
      .orderBy("fetched_at", "desc")
      .limit(50)
      .execute();
  });

  app.get("/albums", async () => {
    return createDb()
      .selectFrom("albums")
      .selectAll()
      .orderBy("updated_at", "desc")
      .limit(100)
      .execute();
  });

  app.get("/tracks", async () => {
    return createDb()
      .selectFrom("tracks")
      .selectAll()
      .orderBy("parsed_at", "desc")
      .limit(100)
      .execute();
  });

  app.get("/library/stats", async () => {
    const db = createDb();
    const [files, artists, albums, tracks] = await Promise.all([
      db.selectFrom("library_files").select((eb: any) => eb.fn.count("id").as("count")).executeTakeFirstOrThrow(),
      db.selectFrom("canonical_artists").select((eb: any) => eb.fn.count("id").as("count")).executeTakeFirstOrThrow(),
      db.selectFrom("albums").select((eb: any) => eb.fn.count("id").as("count")).executeTakeFirstOrThrow(),
      db.selectFrom("tracks").select((eb: any) => eb.fn.count("id").as("count")).executeTakeFirstOrThrow()
    ]) as Array<{ count: string | number }>;

    return {
      files: Number(files.count),
      artists: Number(artists.count),
      albums: Number(albums.count),
      tracks: Number(tracks.count)
    };
  });

  app.get("/schedules", async () => {
    return createDb()
      .selectFrom("notification_schedules")
      .selectAll()
      .orderBy("created_at", "desc")
      .execute();
  });

  app.post("/schedules", async (request) => {
    const payload = scheduleSchema.parse(request.body);
    return createDb()
      .insertInto("notification_schedules")
      .values({
        name: payload.name,
        enabled: payload.enabled,
        cron_expression: payload.cronExpression,
        timezone: payload.timezone,
        channel_type: payload.channelType,
        channel_config: JSON.stringify(payload.channelConfig),
        schedule_config: JSON.stringify(payload.scheduleConfig),
        updated_at: new Date().toISOString()
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  });

  app.put("/schedules/:id", async (request) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    const payload = scheduleSchema.parse(request.body);
    return createDb()
      .updateTable("notification_schedules")
      .set({
        name: payload.name,
        enabled: payload.enabled,
        cron_expression: payload.cronExpression,
        timezone: payload.timezone,
        channel_type: payload.channelType,
        channel_config: JSON.stringify(payload.channelConfig),
        schedule_config: JSON.stringify(payload.scheduleConfig),
        updated_at: new Date().toISOString()
      })
      .where("id", "=", params.id)
      .returningAll()
      .executeTakeFirstOrThrow();
  });

  app.delete("/schedules/:id", async (request) => {
    const params = z.object({ id: z.string() }).parse(request.params);
    await createDb()
      .deleteFrom("notification_schedules")
      .where("id", "=", params.id)
      .execute();

    return { deleted: true };
  });

  return app;
}
