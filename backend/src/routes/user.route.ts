import { Elysia } from "elysia";

import {
  avatarParamsSchema,
  avatarQuerySchema,
} from "@/lib/schemas/user.schema";
import { databasePlugin, servicesPlugin } from "@/plugins/index.plugin";

const userRoute = new Elysia({ prefix: "/users" })
  .use(databasePlugin)
  .use(servicesPlugin)
  .get(
    "/:id/avatar",
    ({ params, query, set, userService, request }) => {
      const id = Number(params.id);

      if (!Number.isInteger(id) || id <= 0) {
        set.status = 404;
        return { error: "Not Found" };
      }

      const row = userService.getById(id);

      if (!row) {
        set.status = 404;
        return { error: "Not Found" };
      }

      const buffer = query.size === "full" ? row.avatar : row.avatarThumb;
      const mime = query.size === "full" ? "image/png" : "image/webp";

      if (!buffer) {
        set.status = 404;
        return { error: "Not found" };
      }

      const tag = `"${row.id}-${query.size}"`;

      if (request.headers.get("if-none-match") === tag) {
        return new Response(null, { headers: { ETag: tag }, status: 304 });
      }

      return new Response(new Uint8Array(buffer), {
        headers: {
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Type": mime,
          ETag: tag,
        },
      });
    },
    {
      params: avatarParamsSchema,
      query: avatarQuerySchema,
    }
  );

export default userRoute;
