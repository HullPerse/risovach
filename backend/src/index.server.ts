import pico from "picocolors";

import { createApp } from "./app.server";
import migrate from "./db/migration.db";
import Logger from "./lib/logger.utils";
import { config, validateConfig } from "./server.config";

const logger = new Logger("SYSTEM");

const configErrors = validateConfig();

if (configErrors.length > 0) {
  logger.error("Configuration errors:");

  for (const error of configErrors) logger.error(`   - ${error}`);
  process.exit(1);
}

migrate();

logger.info("Database migrations applied");

createApp().listen(config.port, (e) => {
  const url = pico.cyan(`http://${e.hostname}:${e.port}`);
  const studio = pico.cyan(`https://local.drizzle.studio`);
  logger.success(`API    -> ${url}`);
  logger.success(`Studio -> ${studio}`);
});

const shutdown = async () => {
  logger.info("Shutting down...");

  const { rawDb } = await import("@/db/index.db");

  try {
    rawDb.run("PRAGMA optimize;");
  } catch (error) {
    logger.error(String(error));
  }

  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
