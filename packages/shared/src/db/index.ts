import { Kysely, PostgresDialect, sql } from "kysely";
import { Pool } from "pg";
import { getEnv } from "../config/env";
import type { MelodyDatabase } from "./types";

export * from "./types";

let pool: Pool | undefined;
let db: Kysely<MelodyDatabase> | undefined;

export function createDb(): Kysely<MelodyDatabase> {
  if (!db) {
    const env = getEnv();
    pool = new Pool({
      connectionString: env.DATABASE_URL
    });

    db = new Kysely<MelodyDatabase>({
      dialect: new PostgresDialect({ pool })
    });
  }

  return db;
}

export async function closeDb(): Promise<void> {
  await db?.destroy();
  db = undefined;
  pool = undefined;
}

export async function upsertJobState(jobName: string, state: unknown): Promise<void> {
  const database = createDb();

  await database
    .insertInto("job_state")
    .values({
      job_name: jobName,
      state: JSON.stringify(state),
      updated_at: new Date().toISOString()
    })
    .onConflict((oc) =>
      oc.column("job_name").doUpdateSet({
        state: JSON.stringify(state),
        updated_at: new Date().toISOString()
      })
    )
    .execute();
}

export async function getJobState<T>(jobName: string): Promise<T | null> {
  const row = await createDb()
    .selectFrom("job_state")
    .select(["state"])
    .where("job_name", "=", jobName)
    .executeTakeFirst();

  if (!row) {
    return null;
  }

  if (typeof row.state === "string") {
    return JSON.parse(row.state) as T;
  }

  return row.state as T;
}

export async function healthcheck(): Promise<void> {
  await sql`select 1`.execute(createDb());
}

