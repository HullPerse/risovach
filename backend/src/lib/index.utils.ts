import type { PublicUser, UserRow } from "@/types/user";

export const nowIso = (): string => new Date().toISOString();

export const omitPassword = <T extends { passwordHash?: string | null }>(
  row: T
): Omit<T, "passwordHash"> => {
  const { passwordHash: _passwordHash, ...rest } = row;
  return rest;
};

export const publicUser = (row: UserRow): PublicUser => ({
  created: row.created,
  id: row.id,
  location: {
    city: row.location?.city ?? null,
    country: row.location?.country ?? null,
  },
  role: row.role,
  username: row.username,
});

export const isStringRecord = (
  value: unknown
): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
