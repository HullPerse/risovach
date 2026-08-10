declare const __APP_MODE__: "DEV" | "PROD" | undefined;

export const APP_MODE: "DEV" | "PROD" = __APP_MODE__ ?? "PROD";

export const IS_DEV_MODE = APP_MODE === "DEV";
