import type * as schema from "@/db/schema.db";

export interface JwtUser {
  sub: string;
  username: string | null;
}

export interface ProcessedAvatar {
  full: Buffer;
  thumb: Buffer;
}

export type UserCache = Map<string, { username: string; expiresAt: number }>;

export interface AuthCookie {
  httpOnly: boolean;
  maxAge: number;
  path: string;
  sameSite: "lax" | "strict" | "none";
  secure: boolean;
}

export interface JwtSigner {
  sign: (payload: Record<string, string | number | boolean>) => Promise<string>;
}

export type UserRole = "user" | "admin" | "subscriber";

export type UserRow = typeof schema.users.$inferSelect;

export interface PublicUser {
  id: number;
  username: string;
  role: UserRole;
  location: {
    city: string | null;
    country: string | null;
  };
  created: string;
}
