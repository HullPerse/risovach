import { Elysia } from "elysia";

import * as schema from "@/db/schema.db";
import { attempt } from "@/lib/attempt.utils";
import { clearSession, setSession, signToken } from "@/lib/auth.utils";
import { resolveClientIp } from "@/lib/geo.utils";
import { processAvatar } from "@/lib/images.utils";
import { nowIso, publicUser } from "@/lib/index.utils";
import { createAppLogger } from "@/lib/logger.utils";
import {
  loginBodySchema,
  registerBodySchema,
} from "@/lib/schemas/auth.schema";
import { broadcast } from "@/lib/websocket.utils";
import {
  authPlugin,
  databasePlugin,
  servicesPlugin,
} from "@/plugins/index.plugin";

const logger = createAppLogger().module("AUTH");

const authRoute = new Elysia({ prefix: "/auth" })
  .use(databasePlugin)
  .use(servicesPlugin)
  .use(authPlugin)
  .post(
    "/register",
    async ({ body, db, jwt, cookie, set, userService, geoService, server, request }) => {
      const username = body.username.toUpperCase();
      const existing = userService.usernameExists(username);

      if (existing) {
        set.status = 409;
        return { error: "Username already exists" };
      }

      const ip = resolveClientIp(server, request);
      const geo = await geoService.resolve(ip, body, () =>
        logger.warn("Failed to resolve geo")
      );

      const [avatar, avatarError] = await attempt(processAvatar(body.avatar));

      if (avatarError) {
        set.status = 400;
        return { error: "Failed to process avatar" };
      }

      const timestamp = nowIso();
      const passwordHash = await Bun.password.hash(body.password);

      const [row] = await db
        .insert(schema.users)
        .values({
          avatar: avatar.full,
          avatarThumb: avatar.thumb,
          created: timestamp,
          location: {
            city: geo.city,
            country: geo.country,
          },
          passwordHash,
          updated: timestamp,
          username,
        })
        .returning();

      const token = await signToken(jwt, row.id);
      setSession(cookie.session, token);

      broadcast("users", "create", String(row.id));
      logger.success(`${username} registered`);
      return { user: publicUser(row) };
    },
    {
      body: registerBodySchema,
    }
  )
  .post(
    "/login",
    async ({ body, jwt, cookie, set, userService }) => {
      const username = body.username.toUpperCase();
      const row = userService.getByUsername(username);

      if (!row) {
        set.status = 401;
        return { error: "Invalid credentials" };
      }

      const valid = await Bun.password.verify(body.password, row.passwordHash);
      if (!valid) {
        set.status = 401;
        return { error: "Invalid credentials" };
      }

      const token = await signToken(jwt, row.id);
      setSession(cookie.session, token);

      logger.success(`${row.username} logged in`);
      return { user: publicUser(row) };
    },
    {
      body: loginBodySchema,
    }
  )
  .post("/logout", ({ cookie }) => {
    clearSession(cookie.session);
    return { ok: true };
  })
  .get("/me", ({ set, user, userService }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const row = userService.getById(Number(user.sub));

    if (!row) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    return { user: publicUser(row) };
  });

export default authRoute;
