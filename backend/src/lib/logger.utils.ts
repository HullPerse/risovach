import pico from "picocolors";

const LEVELS = { debug: 0, error: 4, info: 1, success: 2, warn: 3 } as const;
type LogLevel = keyof typeof LEVELS;

const MIN_LEVEL = LEVELS[(Bun.env.LOG_LEVEL as LogLevel) ?? "info"];

export default class Logger {
  private author: string;

  constructor(author = "SYSTEM") {
    this.author = author;
  }

  private static timestamp(): string {
    return new Date().toISOString().slice(0, 19).replace("T", " ");
  }

  private format(level: LogLevel, message: string): string {
    const colors: Record<LogLevel, (s: string) => string> = {
      debug: pico.magenta,
      error: pico.red,
      info: pico.blue,
      success: pico.green,
      warn: pico.yellow,
    };
    return (
      pico.gray(`[${Logger.timestamp()}]`) +
      colors[level](` [${this.author}]`) +
      pico.white(` ${message}`)
    );
  }

  setAuthor(author: string): this {
    this.author = author;
    return this;
  }

  debug(message: string) {
    if (MIN_LEVEL <= LEVELS.debug) {
      console.debug(this.format("debug", message));
    }
  }
  info(message: string) {
    if (MIN_LEVEL <= LEVELS.info) {
      console.info(this.format("info", message));
    }
  }
  success(message: string) {
    if (MIN_LEVEL <= LEVELS.success) {
      console.log(this.format("success", message));
    }
  }
  warn(message: string) {
    if (MIN_LEVEL <= LEVELS.warn) {
      console.warn(this.format("warn", message));
    }
  }
  error(message: string) {
    if (MIN_LEVEL <= LEVELS.error) {
      console.error(this.format("error", message));
    }
  }
}
