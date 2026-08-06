const config = {
  dbPath: Bun.env.DB_PATH || "./data/db.sqlite",
  dbConfig: {
    cacheSize: parseInt(Bun.env.DB_CACHE_SIZE || "-20000", 10),
    mmapSize: parseInt(Bun.env.DB_MMAP_SIZE || "268435456", 10),
    synchronous: (Bun.env.DB_SYNC || "NORMAL") as "OFF" | "NORMAL" | "FULL",
    tempStore: (Bun.env.DB_TEMP_STORE || "MEMORY") as
      | "DEFAULT"
      | "FILE"
      | "MEMORY",
    walCheckpoint: Bun.env.DB_WAL_CHECKPOINT || "TRUNCATE",
  },
};

export default config;
