import Logger from "@/lib/logger.utils";
import {
  getAppliedMigrations,
  markApplied,
  migrations,
} from "@/lib/migration.utils";
import { rawDb } from "./index.db";

const logger = new Logger("MIGRATIONS");

export default function migrate() {
  const applied = getAppliedMigrations();
  const keys = Object.keys(migrations);

  for (const hash of keys) {
    if (applied.has(hash)) {
      logger.debug(`Skipping ${hash}`);
      continue;
    }

    const { description, sql } = migrations[hash];
    logger.info(`Applying ${hash}: ${description}`);

    for (const stmt of sql) {
      try {
        rawDb.run(stmt);
      } catch (e: unknown) {
        const error = e instanceof Error ? e.message : String(e);

        const ignorablePatterns = [
          "duplicate column",
          "already exists",
          "no such column",
        ];

        if (ignorablePatterns.some((pattern) => error.includes(pattern))) {
          logger.debug(`  ↳ Skipped: ${error}`);
          continue;
        }

        logger.error(`  ✗ Failed: ${error}`);
        throw e;
      }
    }

    markApplied(hash);
    logger.info(`${hash} completed`);
  }

  logger.info("All migrations applied successfully!");
}

//direct executing of migrate
if (import.meta.main) {
  migrate();
}
