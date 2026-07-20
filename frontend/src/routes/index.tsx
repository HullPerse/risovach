import { createRoute, redirect } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";
import { useAuthStore } from "@/stores/auth.store";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (isAuthenticated) {
      throw redirect({ to: "/menu" });
    }
    throw redirect({ to: "/auth" });
  },
});
