import { Elysia } from "elysia";
import Logger from "@/lib/logger.utils";

const logger = new Logger("SYSTEM");

const errorPlugin = new Elysia({ name: "error-handler" }).onError(
  { as: "global" },
  ({ error, code, set }) => {
    if (code === "VALIDATION") {
      set.status = 400;
      const message =
        error instanceof Error ? error.message : "Validation error";
      return { error: message };
    }

    if (code === "NOT_FOUND") {
      set.status = 404;
      return { error: "Not found" };
    }

    if (set.status && Number(set.status) < 500) {
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[${code}] ${message}`);

    set.status = 500;
    return { error: "Internal server error" };
  },
);

export default errorPlugin;
