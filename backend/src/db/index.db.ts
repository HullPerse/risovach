import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import config from "@/db/config.db";
import * as schema from "@/db/schema.db";

const sqlite = new Database(config.dbPath, { create: true});

sqlite.run("PRAGMA journal_mode = WAL;");
sqlite.run("PRAGMA foreign_keys = ON;");
sqlite.run(`PRAGMA synchronous = ${config.dbConfig.synchronous};`);
sqlite.run(`PRAGMA cache_size = ${config.dbConfig.cacheSize};`);
sqlite.run(`PRAGMA mmap_size = ${config.dbConfig.mmapSize};`);
sqlite.run(`PRAGMA temp_store = ${config.dbConfig.tempStore};`);
sqlite.run("PRAGMA auto_vacuum = INCREMENTAL;");
sqlite.run("PRAGMA optimize;");

export const db = drizzle(sqlite, { schema });
export const rawDb = sqlite;
