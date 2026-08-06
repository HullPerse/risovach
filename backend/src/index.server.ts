import { Elysia } from "elysia";
import { registerClient, unregisterClient } from "./lib/websocket.utils";
import Logger from "./lib/logger.utils";
 import {
   errorPlugin,
 } from "./plugins/index.plugin";
import migrate from "./db/migration.db";


const logger = new Logger("SYSTEM");

migrate();
logger.info("Database migrations applied")

new Elysia()
  .ws("/ws", {
  open(ws) {
    registerClient(ws);
  },
  close(ws) {
    unregisterClient(ws);
  },
  })
 .use(errorPlugin)
  .get("/", () => "RISOVACH SERVER")
  .listen(Bun.env.PORT ?? 2000, (e) => {
  const URL = `http://${e.hostname}:${e.port}`;
  logger.info(`API -> ${URL}`);
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
