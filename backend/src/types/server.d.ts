import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

import type * as schema from "@/db/schema.db";

export type Db = BunSQLiteDatabase<typeof schema>;
