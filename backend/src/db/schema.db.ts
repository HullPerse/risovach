import { sqliteTable, text, integer, blob } from "drizzle-orm/sqlite-core";

import type { UserRole } from "@/types/user";

const timestamps = {
  created: text("created").notNull(),
  updated: text("updated").notNull(),
};

export const users = sqliteTable("users", {
  avatar: blob("avatar", { mode: "buffer" }),
  avatarThumb: blob("avatar_thumb", { mode: "buffer" }),
  id: integer("id").primaryKey({ autoIncrement: true }),
  location: text("location", { mode: "json" }).$type<{
    country: string | null;
    city: string | null;
  } | null>(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("user").$type<UserRole>(),
  username: text("username").notNull().unique(),
  ...timestamps,
});
