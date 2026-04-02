import fs from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import { getEnv } from "../config/env";

async function runMigrations() {
  const env = getEnv();
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const client = await pool.connect();

  try {
    const migrationDir = path.resolve(__dirname, "../../migrations");
    const files = (await fs.readdir(migrationDir))
      .filter((file) => file.endsWith(".sql"))
      .sort();

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    for (const file of files) {
      const existing = await client.query("SELECT 1 FROM schema_migrations WHERE version = $1", [file]);
      if (existing.rowCount) {
        continue;
      }

      const sql = await fs.readFile(path.join(migrationDir, file), "utf8");
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [file]);
      await client.query("COMMIT");
    }
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

