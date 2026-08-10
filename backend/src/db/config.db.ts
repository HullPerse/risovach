import { resolveBackendPath } from "@/lib/path.utils";

const config = {
  dbConfig: {
    cacheSize: Math.trunc(Number(Bun.env.DB_CACHE_SIZE || "-20000")),
    mmapSize: Math.trunc(Number(Bun.env.DB_MMAP_SIZE || "268435456")),
    synchronous: (Bun.env.DB_SYNC || "NORMAL") as "OFF" | "NORMAL" | "FULL",
    tempStore: (Bun.env.DB_TEMP_STORE || "MEMORY") as
      | "DEFAULT"
      | "FILE"
      | "MEMORY",
    walCheckpoint: Bun.env.DB_WAL_CHECKPOINT || "TRUNCATE",
  },
  dbPath: resolveBackendPath(Bun.env.DB_PATH || "data/db.sqlite"),
};

export default config;
