import { Elysia } from "elysia";

import { GeoService } from "@/api/geo.api";
import { UserService } from "@/services/user.service";

const userService = new UserService();
const geoService = new GeoService();

export const servicesPlugin = new Elysia({ name: "services" })
  .decorate("userService", userService)
  .decorate("geoService", geoService);

export default servicesPlugin;
