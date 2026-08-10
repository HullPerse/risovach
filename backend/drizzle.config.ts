import path from "node:path";

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dbCredentials: {
    url: path.resolve(process.env.DB_PATH ?? "data/db.sqlite"),
  },
  dialect: "sqlite",
  out: "./drizzle",
  schema: "./src/db/schema.db.ts",
});
