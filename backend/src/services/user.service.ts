import { eq } from "drizzle-orm";

import { db } from "@/db/index.db";
import * as schema from "@/db/schema.db";
import type { UserRow } from "@/types/user";

export class UserService {
  private database = db;

  constructor(database: typeof db = db) {
    this.database = database;
  }

  getByUsername(username: string): UserRow | undefined {
    return this.database
      .select()
      .from(schema.users)
      .where(eq(schema.users.username, username))
      .get();
  }

  getById(id: number): UserRow | undefined {
    return this.database
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .get();
  }

  getUsernameById(id: number): string | null {
    const row = this.database
      .select({ username: schema.users.username })
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .get();

    return row?.username ?? null;
  }

  usernameExists(username: string): boolean {
    return Boolean(
      this.database
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.username, username))
        .get()
    );
  }
}

export const userService = new UserService();
