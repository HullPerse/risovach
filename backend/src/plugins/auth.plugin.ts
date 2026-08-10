import { jwt } from "@elysiajs/jwt";
import { Elysia } from "elysia";

import { resolveUsername } from "@/lib/auth.utils";
import { config } from "@/server.config";
import type { JwtUser } from "@/types/auth";

const authPlugin = new Elysia({ name: "auth" })
  .use(
    jwt({
      exp: config.jwtExp,
      name: "jwt",
      secret: config.jwtSecret,
    })
  )
  .derive({ as: "scoped" }, async ({ jwt: jwtInstance, cookie }) => {
    const token = cookie.session.value ?? null;

    if (!token) return { token: null, user: null };

    const payload = await jwtInstance.verify(String(token));

    if (!payload) return { token, user: null };
    if (typeof payload.sub !== "string") return { token, user: null };

    const username = resolveUsername(payload.sub);

    return {
      token,
      user: {
        sub: payload.sub,
        username,
      } as JwtUser,
    };
  })
  .macro({
    requireAuth: {
      resolve({ user, set }) {
        if (!user) {
          set.status = 401;
          throw new Error("Unauthorized");
        }
        return { user };
      },
    },
  });

export default authPlugin;
