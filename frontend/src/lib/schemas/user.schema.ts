import { z } from "zod";

export const locationSchema = z.object({
  city: z.string().nullable(),
  country: z.string().nullable(),
});

export const userSchema = z.object({
  created: z.string(),
  id: z.number(),
  location: locationSchema,
  role: z.enum(["user", "admin", "subscriber"]),
  username: z.string(),
});

export const userResponseSchema = z.object({
  user: userSchema,
});

export const okSchema = z.object({ ok: z.boolean() });
