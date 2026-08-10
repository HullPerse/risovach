import { Elysia, t } from "elysia";

import * as schema from "@/db/schema.db";
import { clearSession, setSession, signToken } from "@/lib/auth.utils";
import { processAvatar } from "@/lib/images.utils";
import { nowIso, extractClientIp, isPrivateIp, publicUser } from "@/lib/index.utils";
import Logger from "@/lib/logger.utils";
import { broadcast } from "@/lib/websocket.utils";
import {
  authPlugin,
  databasePlugin,
  servicesPlugin,
} from "@/plugins/index.plugin";
import type { ProcessedAvatar } from "@/types/auth";

const logger = new Logger("AUTH");

const authRoute = new Elysia({ prefix: "/auth" })
  .use(databasePlugin)
  .use(servicesPlugin)
  .use(authPlugin)
  .post(
    "/register",
    async ({ body, db, jwt, cookie, set, userService, server, request }) => {
      const username = body.username.toUpperCase();
      const existing = await userService.usernameExists(username);

      if (existing) {
        set.status = 409;
        return { error: "Username already exists" };
      }

      let ip: string | undefined;

      if (server) ip = server.requestIP(request)?.address ?? undefined;
      ip ??= extractClientIp(request);

      const geo: {
        country: string | null;
        city: string | null;
      } = {
        city: null,
        country: null,
      };

      if (ip && !isPrivateIp(ip)) {
        try {
          const res = await fetch(`https://ipapi.co/${ip}/json/`, {
            signal: AbortSignal.timeout(3000),
          });
          const data = (await res.json()) as {
            city?: string;
            country_code?: string;
          };
          geo.country = data.country_code?.toUpperCase() ?? null;
          geo.city = data.city ?? null;
        } catch {
          logger.warn(`Failed to resolve geo for ${ip}`);
        }
      }

      if (geo.country === null && geo.city === null) {
        geo.country = body.country ?? null;
        geo.city = body.city ?? null;
      }

      let avatar: ProcessedAvatar;

      try {
        avatar = await processAvatar(body.avatar);
      } catch {
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
      logger.setAuthor(username).success("registered");
      return { user: publicUser(row) };
    },
    {
      body: t.Object({
        avatar: t.File(),
        city: t.Optional(t.String({ maxLength: 100 })),
        country: t.Optional(t.String({ maxLength: 100 })),
        password: t.String({ maxLength: 24, minLength: 4 }),
        username: t.String({ maxLength: 24, minLength: 4 }),
      }),
    }
  )
  .post(
    "/login",
    async ({ body, jwt, cookie, set, userService }) => {
      const username = body.username.toUpperCase();
      const row = await userService.getByUsername(username);

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

      logger.setAuthor(row.username).success("logged in");
      return { user: publicUser(row) };
    },
    {
      body: t.Object({
        password: t.String(),
        username: t.String(),
      }),
    }
  )
  .post("/logout", ({ cookie }) => {
    clearSession(cookie.session);
    return { ok: true };
  })
  .get("/me", async ({ set, user, userService }) => {
    if (!user) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    const row = await userService.getById(Number(user.sub));

    if (!row) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    return { user: publicUser(row) };
  });

export default authRoute;
