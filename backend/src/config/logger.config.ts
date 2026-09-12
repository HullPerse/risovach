import type { LoggerSettings } from "hp_logger";

export const LOGGER_SETTINGS: LoggerSettings = {
  formatContext: "kv",
  mode: "pretty",
  stripControl: true,
  tagCase: "upper",
};
