import { rawDb } from "@/db/index.db";
import { attemptSync } from "@/lib/attempt.utils";
import type { Migration } from "@/types/server";

export const migrations: Record<string, Migration> = {
  "0001_users": {
    description: "Users table",
    sql: [
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        location TEXT,
        avatar BLOB,
        avatar_thumb BLOB,
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      );`,
      `CREATE UNIQUE INDEX IF NOT EXISTS users_username_idx ON users(username);`,
    ],
  },
  "0002_drop_avatar_version": {
    description: "Drop unused avatar_version column",
    sql: [`ALTER TABLE users DROP COLUMN avatar_version;`],
  },
  "0003_drop_avatar_mimes": {
    description: "Drop unused avatar_mime and avatar_thumb_mime columns",
    sql: [
      "ALTER TABLE users DROP COLUMN avatar_mime;",
      "ALTER TABLE users DROP COLUMN avatar_thumb_mime;",
    ],
  },
};

export const getAppliedMigrations = (): Set<string> => {
  const [rows, error] = attemptSync(
    () =>
      rawDb.query("SELECT hash FROM __drizzle_migrations").all() as {
        hash: string;
      }[]
  );

  if (!error) return new Set(rows.map((row) => row.hash));

  rawDb.run(`
       CREATE TABLE IF NOT EXISTS __drizzle_migrations (
         hash TEXT PRIMARY KEY,
         created_at INTEGER NOT NULL
       );
     `);
  return new Set();
};

export const markApplied = (hash: string) => {
  rawDb
    .prepare(
      "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)"
    )
    .run(hash, Date.now());
};
