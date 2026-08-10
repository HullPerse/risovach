import type { users } from "@/db/schema.db";

export const nowIso = (): string => new Date().toISOString();

export const extractClientIp = (request: Request): string | undefined => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) return undefined;

  const first = forwarded.split(",")[0]?.trim();
  return first || undefined;
};

export const isPrivateIp = (ip: string): boolean => {
  const normalized = ip.toLowerCase();
  if (normalized === "::1") return true;

  const v4 = normalized.startsWith("::ffff:")
    ? normalized.slice(7)
    : normalized;
  const parts = v4.split(".").map(Number);

  if (
    parts.length !== 4 ||
    parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)
  ) {
    return false;
  }

  const [a, b] = parts;
  const inRange = (min: number, max: number) => b >= min && b <= max;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && inRange(64, 127)) ||
    (a === 169 && b === 254) ||
    (a === 172 && inRange(16, 31)) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
};

export const omitPassword = <T extends { passwordHash?: string | null }>(
  row: T
): Omit<T, "passwordHash"> => {
  const { passwordHash: _passwordHash, ...rest } = row;
  return rest;
};

export type UserRow = typeof users.$inferSelect;

export interface PublicUser {
  id: number;
  username: string;
  location: {
    city: string | null;
    country: string | null;
  };
  created: string;
}

export const publicUser = (row: UserRow): PublicUser => ({
  created: row.created,
  id: row.id,
  location: {
    city: row.location?.city ?? null,
    country: row.location?.country ?? null,
  },
  username: row.username,
});
