import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";

import { config } from "@/server.config";

const corsPlugin = new Elysia({ name: "cors" }).use(
  cors({
    credentials: true,
    origin: config.corsOrigin,
  })
);

export default corsPlugin;
