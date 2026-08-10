import { Elysia } from "elysia";

import { db } from "@/db/index.db";

export default new Elysia({ name: "transaction" }).decorate(
  "transaction",
  db.transaction.bind(db)
);
