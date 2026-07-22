import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { lazy } from "react";

import { BigLoader } from "@/components/shared/loader.component";
import { BigError } from "@/components/shared/error.component";
import AuthPage from "./auth.route";
import Menu from "./menu.route";
import { useAuthStore } from "@/stores/auth.store";

const App = lazy(() => import("@/App"));

const rootRoute = createRootRoute({
  component: App,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: App,
  pendingComponent: BigLoader,
  beforeLoad: ({ matches }) => {
    const isAuth = useAuthStore.getState().isAuthenticated;

    for (const match of matches) {
      if (match.routeId !== "/auth" && !isAuth) {
        throw redirect({ to: "/auth", replace: true });
      }
    }
  },
});

const errorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/error",
  component: () => <BigError />,
});

const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth",
  component: AuthPage,
});
const menuRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/menu",
  component: () => Menu,
  pendingComponent: BigLoader,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  authRoute,
  menuRoute,
  errorRoute,
]);

export const router = createRouter({ routeTree });
