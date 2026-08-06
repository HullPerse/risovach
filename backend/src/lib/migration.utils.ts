import { rawDb } from "@/db/index.db";
import type { Migration } from "@/types/server";

export const migrations: Record<string, Migration> = {
  "0001_initial": {
    description: "Core tables",
    sql: [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        place TEXT,
        tickets INTEGER NOT NULL DEFAULT 0,
        tickets_bought_today INTEGER NOT NULL DEFAULT 0,
        tickets_date TEXT,
        gambling_winnings INTEGER NOT NULL DEFAULT 0,
        gambling_banned INTEGER NOT NULL DEFAULT 0,
        hangman INTEGER NOT NULL DEFAULT 0,
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      );`
    ],
  },
};

export function getAppliedMigrations(): Set<string> {
  try {
    const rows = rawDb.query("SELECT hash FROM __drizzle_migrations").all() as {
      hash: string;
    }[];
    return new Set(rows.map((row) => row.hash));
  } catch {
    rawDb.run(`
       CREATE TABLE IF NOT EXISTS __drizzle_migrations (
         hash TEXT PRIMARY KEY,
         created_at INTEGER NOT NULL
       );
     `);
    return new Set();
  }
}

export function markApplied(hash: string) {
  rawDb
    .prepare(
      "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
    )
    .run(hash, Date.now());
}
