import { createLogger, getEnv } from "@melody/shared";
import { buildApp } from "./app";

async function main() {
  const env = getEnv();
  const logger = createLogger("api");
  const app = buildApp();

  await app.listen({
    host: "0.0.0.0",
    port: env.API_PORT
  });

  logger.info({
    event: "api_started",
    port: env.API_PORT
  });
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

