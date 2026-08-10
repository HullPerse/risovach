import { Elysia } from "elysia";

import { db } from "@/db/index.db";

const databasePlugin = new Elysia({ name: "db" }).decorate("db", db);

export default databasePlugin;
