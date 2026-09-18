import { t } from "elysia";

export const registerBodySchema = t.Object({
  avatar: t.File(),
  city: t.Optional(t.String({ maxLength: 100 })),
  country: t.Optional(t.String({ maxLength: 100 })),
  password: t.String({ maxLength: 24, minLength: 4 }),
  username: t.String({ maxLength: 24, minLength: 4 }),
});

export const loginBodySchema = t.Object({
  password: t.String(),
  username: t.String(),
});
