import { createRoute } from "@tanstack/react-router";

import { Route as rootRoute } from "./__root";
import { BigError } from "@/components/shared/error.component";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/error",
  component: () => <BigError />,
});
