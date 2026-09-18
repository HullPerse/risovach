import { t } from "elysia";

export const avatarParamsSchema = t.Object({ id: t.String() });

export const avatarQuerySchema = t.Object({
  size: t.Optional(t.Union([t.Literal("thumb"), t.Literal("full")])),
});
