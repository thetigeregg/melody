import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  MUSIC_DIR: z.string().min(1).default("/music"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_PORT: z.coerce.number().int().positive().default(4200),
  LASTFM_API_KEY: z.string().optional(),
  LASTFM_USERNAME: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  TZ: z.string().default("Europe/Zurich"),
  LOG_LEVEL: z.string().default("info"),
  MUSICBRAINZ_USER_AGENT: z.string().default("music-intelligence/1.0 (contact@example.com)"),
  DEFAULT_RECOMMENDATION_EXTERNAL_RATIO: z.coerce.number().min(0).max(1).default(0.7),
  DEFAULT_RECOMMENDATION_REDISCOVERY_RATIO: z.coerce.number().min(0).max(1).default(0.3),
  DEFAULT_NOTIFICATION_TIMEZONE: z.string().default("Europe/Zurich"),
  TAG_SCAN_CONCURRENCY: z.coerce.number().int().min(1).max(8).default(4),
  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().min(1000).default(30000)
});

export type MelodyEnv = z.infer<typeof envSchema>;

let cachedEnv: MelodyEnv | undefined;

export function getEnv(): MelodyEnv {
  if (!cachedEnv) {
    cachedEnv = envSchema.parse(process.env);
  }

  return cachedEnv;
}

