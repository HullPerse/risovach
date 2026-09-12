import { captureConsole, installErrorHandlers } from "hp_logger";

import { createApp } from "./app.server";
import { rawDb } from "./db/index.db";
import migrate from "./db/migration.db";
import { attemptSync } from "./lib/attempt.utils";
import { createAppLogger } from "./lib/logger.utils";
import { config, validateConfig } from "./server.config";

const logger = createAppLogger().module("SYSTEM");

installErrorHandlers(logger);
captureConsole(logger);

const configErrors = validateConfig();

if (configErrors.length > 0) {
  logger.error("configuration invalid", { errors: configErrors });
  await logger.close();
  process.exit(1);
}

migrate();

logger.info("Database migrations applied");

createApp().listen(config.port, (e) => {
  logger.success("api listening", { url: `http://${e.hostname}:${e.port}` });
  logger.success("studio listening", { url: "https://local.drizzle.studio" });
});

const shutdown = async () => {
  logger.info("Shutting down...");

  const [, error] = attemptSync(() => rawDb.run("PRAGMA optimize;"));

  if (error) logger.error("shutdown failed", { error });

  await logger.close();
  process.exit(0);
};

// shutdown не падает: ошибки внутри перехвачены, logger.close их не пробрасывает.
const handleSignal = () => {
  shutdown();
};

process.on("SIGINT", handleSignal);
process.on("SIGTERM", handleSignal);
