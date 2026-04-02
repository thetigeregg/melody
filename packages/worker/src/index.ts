import { closeDb, createLogger, getEnv, getJobState, healthcheck, upsertJobState } from "@melody/shared";
import { ingestLastfmScrobbles } from "./importers/ingestLastfm";
import { refreshArtistSimilarity } from "./jobs/refreshArtistSimilarity";
import { runIncrementalScan } from "./scanners/libraryScanner";
import { executeSchedules } from "./schedules/executor";

export { runIncrementalScan } from "./scanners/libraryScanner";
export { generateRecommendations } from "./recommenders/engine";
export { ingestLastfmScrobbles } from "./importers/ingestLastfm";
export { executeSchedules } from "./schedules/executor";

interface TriggerState {
  requestedAt?: string;
  status?: "pending" | "running" | "completed" | "failed";
  payload?: Record<string, unknown>;
}

async function handleTrigger(jobName: string, runner: () => Promise<void>) {
  const state = await getJobState<TriggerState>(`${jobName}-trigger`);
  if (!state?.requestedAt || state.status === "running") {
    return;
  }

  await upsertJobState(`${jobName}-trigger`, {
    ...state,
    status: "running"
  });

  try {
    await runner();
    await upsertJobState(`${jobName}-trigger`, {
      ...state,
      status: "completed",
      completedAt: new Date().toISOString()
    });
  } catch (error) {
    await upsertJobState(`${jobName}-trigger`, {
      ...state,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown trigger error"
    });
  }
}

async function main() {
  const env = getEnv();
  const logger = createLogger("worker");

  await healthcheck();
  logger.info({ event: "worker_started", poll_interval_ms: env.WORKER_POLL_INTERVAL_MS });

  const loop = async () => {
    try {
      await handleTrigger("scan-library", async () => {
        await runIncrementalScan();
      });
      await handleTrigger("ingest-lastfm", async () => {
        await ingestLastfmScrobbles();
      });
      await handleTrigger("refresh-artist-similarity", async () => {
        await refreshArtistSimilarity();
      });
      await executeSchedules();
    } catch (error) {
      logger.error({
        event: "worker_loop_failed",
        error: error instanceof Error ? error.message : "Unknown worker loop error"
      });
    }
  };

  await loop();
  setInterval(() => {
    void loop();
  }, env.WORKER_POLL_INTERVAL_MS);
}

void main().catch(async (error) => {
  console.error(error);
  await closeDb();
  process.exitCode = 1;
});

