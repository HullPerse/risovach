import type { Cookie } from "elysia";

import { CACHE_TTL, COOKIE_OPTIONS, usernameCache } from "@/config/auth.config";
import { userService } from "@/services/user.service";
import type { JwtSigner } from "@/types/auth";

export const resolveUsername = async (
  userId: string
): Promise<string | null> => {
  const cached = usernameCache.get(userId);

  if (cached && cached.expiresAt > Date.now()) return cached.username;

  try {
    const username = await userService.getUsernameById(Number(userId));
    if (!username) return null;

    usernameCache.set(userId, {
      expiresAt: Date.now() + CACHE_TTL,
      username,
    });

    return username;
  } catch {
    return null;
  }
};

export const setSession = (cookie: Cookie<unknown>, token: string) => {
  cookie.set({ value: token, ...COOKIE_OPTIONS });
};

export const clearSession = (cookie: Cookie<unknown>) => {
  cookie.remove();
};

export const signToken = (jwtInstance: JwtSigner, userId: number) =>
  jwtInstance.sign({ sub: String(userId) });
