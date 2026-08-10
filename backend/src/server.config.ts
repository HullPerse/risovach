import { resolveBackendPath } from "@/lib/path.utils";

const parseCorsOrigin = (
  value: string | undefined
): boolean | string | string[] => {
  if (value === undefined || value === "") return true;

  const normalized = value.trim().toLowerCase();

  if (normalized === "true" || normalized === "*") return true;
  if (normalized === "false") return false;

  const trimmedValue = value.includes(",");

  if (!trimmedValue) return value.trim();

  const finalValue = value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  return finalValue;
};

export const config = {
  avatarFull: Math.trunc(Number(Bun.env.AVATAR_FULL || "420")),
  avatarMaxBytes: Math.trunc(Number(Bun.env.AVATAR_MAX_BYTES || "2097152")),
  avatarThumb: Math.trunc(Number(Bun.env.AVATAR_THUMB || "120")),
  corsOrigin: parseCorsOrigin(Bun.env.CORS_ORIGIN),
  dbPath: resolveBackendPath(Bun.env.DB_PATH || "data/db.sqlite"),
  ip: Bun.env.IP || "0.0.0.0",
  jwtExp: Bun.env.JWT_EXP || "7d",
  jwtSecret: String(Bun.env.JWT_SECRET ?? undefined),
  port: Number(Bun.env.PORT) || 3000,
};

export const validateConfig = (): string[] => {
  const errors: string[] = [];

  if (!Bun.env.JWT_SECRET) {
    errors.push("JWT_SECRET is required");
  }
  if (Bun.env.PORT && Number.isNaN(Bun.env.PORT)) {
    errors.push("PORT must be a number");
  }
  if (
    Bun.env.AVATAR_MAX_BYTES &&
    Number.isNaN(Number(Bun.env.AVATAR_MAX_BYTES))
  ) {
    errors.push("AVATAR_MAX_BYTES must be a number");
  }
  if (Bun.env.AVATAR_FULL && Number.isNaN(Number(Bun.env.AVATAR_FULL))) {
    errors.push("AVATAR_FULL must be a number");
  }
  if (Bun.env.AVATAR_THUMB && Number.isNaN(Number(Bun.env.AVATAR_THUMB))) {
    errors.push("AVATAR_THUMB must be a number");
  }

  return errors;
};
