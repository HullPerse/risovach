import type { Cookie } from "elysia";

import { CACHE_TTL, COOKIE_OPTIONS, usernameCache } from "@/config/auth.config";
import { attemptSync } from "@/lib/attempt.utils";
import { userService } from "@/services/user.service";
import type { JwtSigner } from "@/types/user";

export const resolveUsername = (userId: string): string | null => {
  const cached = usernameCache.get(userId);

  if (cached && cached.expiresAt > Date.now()) return cached.username;

  const [username, error] = attemptSync(() =>
    userService.getUsernameById(Number(userId))
  );

  if (error || !username) return null;

  usernameCache.set(userId, {
    expiresAt: Date.now() + CACHE_TTL,
    username,
  });

  return username;
};

export const setSession = (cookie: Cookie<unknown>, token: string) => {
  cookie.set({ value: token, ...COOKIE_OPTIONS });
};

export const clearSession = (cookie: Cookie<unknown>) => {
  cookie.remove();
};

export const signToken = (jwtInstance: JwtSigner, userId: number) =>
  jwtInstance.sign({ sub: String(userId) });
