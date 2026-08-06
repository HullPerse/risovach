import { sqliteTable, text } from "drizzle-orm/sqlite-core";

const timestamps = {
  created: text("created").notNull(),
  updated: text("updated").notNull(),
};

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  avatar: text("avatar").notNull().default(""),
  ...timestamps,
});
