import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { lazy } from "react";

import { BigError } from "@/components/shared/error.component";
import { initializeUserStore, useUserStore } from "@/stores/user.store";

const requireAuth = async () => {
  await initializeUserStore();

  if (!useUserStore.getState().user) {
    throw redirect({ replace: true, to: "/auth" });
  }
};

const App = lazy(() => import("@/App"));
const AuthPage = lazy(() => import("./auth.route"));
const MenuPage = lazy(() => import("./menu.route"));

const rootRoute = createRootRoute({
  component: App,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: async () => {
    await requireAuth();
    throw redirect({ replace: true, to: "/menu" });
  },
});

const errorRoute = createRoute({
  component: BigError,
  getParentRoute: () => rootRoute,
  path: "/error",
});

const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth",
  component: AuthPage,
});

const menuRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/menu",
  beforeLoad: requireAuth,
  component: MenuPage,
});

const routerTree = rootRoute.addChildren([
  indexRoute,
  authRoute,
  menuRoute,
  errorRoute,
]);

export const router = createRouter({
  routeTree: routerTree,
  defaultPreload: "intent",
  scrollRestoration: true,
});
