import Elysia from "elysia";

import { UserService } from "@/services/user.service";

const userService = new UserService();

export const servicesPlugin = new Elysia({ name: "services" }).decorate(
  "userService",
  userService
);

export default servicesPlugin;
