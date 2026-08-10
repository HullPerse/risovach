import { sqliteTable, text, integer, blob } from "drizzle-orm/sqlite-core";

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
  username: text("username").notNull().unique(),
  ...timestamps,
});
