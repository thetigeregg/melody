import pino from "pino";
import { getEnv } from "../config/env";

export function createLogger(service: string) {
  const env = getEnv();

  return pino({
    level: env.LOG_LEVEL,
    base: {
      service
    },
    timestamp: () => `,"ts":"${new Date().toISOString()}"`
  });
}

