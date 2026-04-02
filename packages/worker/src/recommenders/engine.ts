import { createDb, createLogger, getEnv } from "@melody/shared";
import type { RecommendationConfig, RecommendationItemResult } from "../types";

function getTier(lifetimePlays: number, lastPlayedAt?: Date | null, inLibrary?: boolean): "new" | "rediscovery" | "frequent" {
  if (lifetimePlays < 3) {
    return "new";
  }

  if (inLibrary && lastPlayedAt) {
    const ageDays = (Date.now() - lastPlayedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays >= 180) {
      return "rediscovery";
    }
  }

  return "frequent";
}

export async function generateRecommendations(
  triggerType: "scheduled" | "manual" | "prompt",
  config?: Partial<RecommendationConfig>,
  queryText?: string
) {
  const env = getEnv();
  const db = createDb();
  const logger = createLogger("worker");
  const resolvedConfig: RecommendationConfig = {
    externalRatio: config?.externalRatio ?? env.DEFAULT_RECOMMENDATION_EXTERNAL_RATIO,
    localRatio: config?.localRatio ?? env.DEFAULT_RECOMMENDATION_REDISCOVERY_RATIO,
    limit: config?.limit ?? 15,
    includeExplanations: config?.includeExplanations ?? true
  };

  const run = await db
    .insertInto("recommendation_runs")
    .values({
      trigger_type: triggerType,
      status: "running",
      query_text: queryText ?? null,
      config: JSON.stringify(resolvedConfig)
    })
    .returning(["id"])
    .executeTakeFirstOrThrow();

  try {
    const playStats = await db
      .selectFrom("canonical_artists as a")
      .leftJoin("lastfm_scrobbles as s", "s.canonical_artist_id", "a.id")
      .leftJoin("tracks as t", "t.canonical_album_artist_id", "a.id")
      .select((eb: any) => [
        "a.id as artist_id",
        "a.canonical_name",
        eb.fn.count("s.id").as("play_count"),
        eb.fn.max("s.scrobbled_at").as("last_played_at"),
        eb.fn.count("t.id").as("track_count")
      ])
      .groupBy(["a.id", "a.canonical_name"])
      .execute();

    const externalLimit = Math.round(resolvedConfig.limit * resolvedConfig.externalRatio);
    const results: RecommendationItemResult[] = playStats
      .map((row: any) => {
        const playCount = Number(row.play_count);
        const trackCount = Number(row.track_count);
        const lastPlayedAt = row.last_played_at ? new Date(row.last_played_at as unknown as string) : null;
        const tier = getTier(playCount, lastPlayedAt, trackCount > 0);
        const sourceBucket: "local" | "external" = trackCount > 0 ? "local" : "external";
        const score = sourceBucket === "external" ? Math.max(0, 10 - playCount) : Math.max(0, 20 - playCount);

        return {
          rank: 0,
          recommendationType: "artist" as const,
          tier,
          sourceBucket,
          canonicalArtistId: row.artist_id,
          displayName: row.canonical_name,
          explanation: resolvedConfig.includeExplanations
            ? sourceBucket === "external"
              ? "Adjacent to your listening history with low play exposure."
              : "Present locally but underplayed relative to your library."
            : undefined,
          score
        };
      })
      .filter((row: RecommendationItemResult) => row.tier !== "frequent" || Boolean(queryText))
      .sort((left: RecommendationItemResult, right: RecommendationItemResult) => right.score - left.score);

    const chosen = [
      ...results.filter((item) => item.sourceBucket === "external").slice(0, externalLimit),
      ...results.filter((item) => item.sourceBucket === "local").slice(0, resolvedConfig.limit - externalLimit)
    ]
      .slice(0, resolvedConfig.limit)
      .map((item, index) => ({
        ...item,
        rank: index + 1
      }));

    for (const item of chosen) {
      await db
        .insertInto("recommendation_items")
        .values({
          recommendation_run_id: run.id,
          rank: item.rank,
          recommendation_type: item.recommendationType,
          tier: item.tier,
          source_bucket: item.sourceBucket,
          canonical_artist_id: item.canonicalArtistId ?? null,
          track_id: item.trackId ?? null,
          display_name: item.displayName,
          explanation: item.explanation ?? null,
          score: item.score.toFixed(6),
          raw_payload: JSON.stringify(item)
        })
        .execute();
    }

    await db
      .updateTable("recommendation_runs")
      .set({
        status: "completed",
        finished_at: new Date().toISOString()
      })
      .where("id", "=", run.id)
      .execute();

    logger.info({
      job: "generate-recommendations",
      event: "recommendations_completed",
      recommendation_run_id: run.id,
      count: chosen.length
    });

    return {
      runId: run.id,
      items: chosen
    };
  } catch (error) {
    await db
      .updateTable("recommendation_runs")
      .set({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown recommendation error",
        finished_at: new Date().toISOString()
      })
      .where("id", "=", run.id)
      .execute();

    throw error;
  }
}
