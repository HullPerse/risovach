import { Elysia } from "elysia";

import Logger from "@/lib/logger.utils";

const logger = new Logger("SYSTEM");

const errorPlugin = new Elysia({ name: "error-handler" }).onError(
  { as: "global" },
  ({ error, code, request, set }) => {
    const message = error instanceof Error ? error.message : String(error);

    logger.warn(`${code}: ${request.method} ${request.url}: ${message}`);

    if (code === "NOT_FOUND") set.status = 404;
    else if (code === "VALIDATION" || code === "PARSE") set.status = 400;
    else set.status = 500;

    return { error: message };
  }
);

export default errorPlugin;
