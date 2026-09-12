import { attemptSync } from "@/lib/attempt.utils";
import { createAppLogger } from "@/lib/logger.utils";
import {
  getAppliedMigrations,
  markApplied,
  migrations,
} from "@/lib/migration.utils";

import { rawDb } from "./index.db";

const logger = createAppLogger().module("MIGRATIONS");

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
      const [, error] = attemptSync(() => rawDb.run(stmt));

      if (!error) continue;

      const { message } = error;

      const ignorablePatterns = [
        "duplicate column",
        "already exists",
        "no such column",
      ];

      if (ignorablePatterns.some((pattern) => message.includes(pattern))) {
        logger.debug(`Skipped: ${message}`);
        continue;
      }

      logger.error(`Failed: ${message}`);
      throw error;
    }

    markApplied(hash);
    logger.success(`${hash} completed`);
  }

  logger.info("All migrations applied successfully!");
}

if (import.meta.main) migrate();
