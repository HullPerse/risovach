import type { AuthCookie, UserCache } from "@/types/user";

export const usernameCache: UserCache = new Map();

export const CACHE_TTL = 5 * 60 * 1000;

export const COOKIE_OPTIONS = {
  httpOnly: true,
  maxAge: 7 * 24 * 60 * 60,
  path: "/",
  sameSite: "lax",
  secure: Bun.env.NODE_ENV === "production",
} as AuthCookie;
