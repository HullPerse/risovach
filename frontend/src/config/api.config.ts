export const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:22848";

export const WS_URL = API_URL.replace(/^http/u, "ws");

/**
 * Extension and content type of a project file. The type is deliberately
 * generic: `.hpd` is our own format and must not pose as an image.
 */
export const PROJECT_EXTENSION = "hpd";
export const PROJECT_TYPE = "application/octet-stream";
