import { Elysia } from "elysia";

import { registerClient, unregisterClient } from "@/lib/websocket.utils";
import {
  authPlugin,
  corsPlugin,
  databasePlugin,
  errorPlugin,
  servicesPlugin,
  transactionPlugin,
} from "@/plugins/index.plugin";
import { authRoute, userRoute } from "@/routes/index.route";

export const createApp = () =>
  new Elysia()
    .use(corsPlugin)
    .use(errorPlugin)
    .use(databasePlugin)
    .use(transactionPlugin)
    .use(servicesPlugin)
    .use(authPlugin)
    .use(authRoute)
    .use(userRoute)
    .ws("/ws", {
      close(ws) {
        unregisterClient(ws);
      },
      open(ws) {
        registerClient(ws);
      },
    })
    .get("/health", () => ({ ok: true }))
    .get("/", () => "RISOVACH SERVER");
