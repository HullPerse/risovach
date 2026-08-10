import { eq } from "drizzle-orm";

import { db } from "@/db/index.db";
import * as schema from "@/db/schema.db";
import type { UserRow } from "@/lib/index.utils";

export class UserService {
  private database = db;

  constructor(database: typeof db = db) {
    this.database = database;
  }

  async getByUsername(username: string): Promise<UserRow> {
    const [row] = await this.database
      .select()
      .from(schema.users)
      .where(eq(schema.users.username, username));

    return row;
  }

  async getById(id: number): Promise<UserRow> {
    const [row] = await this.database
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id));

    return row;
  }

  async getUsernameById(id: number): Promise<string> {
    const [row] = await this.database
      .select({ username: schema.users.username })
      .from(schema.users)
      .where(eq(schema.users.id, id));

    return row?.username ?? null;
  }

  async usernameExists(username: string): Promise<boolean> {
    const [row] = await this.database
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.username, username));

    return Boolean(row);
  }
}

export const userService = new UserService();
