import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  redirect,
} from "@tanstack/react-router";
import { lazy } from "react";

import { bigError } from "@/components/shared/error.component";
import { BigLoader } from "@/components/shared/loader.component";
import { initializeUserStore, useUserStore } from "@/stores/user.store";

const AuthPage = lazyRouteComponent(() => import("./auth.route"));
const MenuPage = lazyRouteComponent(() => import("./menu.route"));

const requireAuth = () => async () => {
  await initializeUserStore();

  if (useUserStore.getState().user) {
    return;
  }
  throw redirect({ replace: true, to: "/auth" });
};

const App = lazy(() => import("@/App"));

const rootRoute = createRootRoute({
  component: App,
});

const indexRoute = createRoute({
  beforeLoad: requireAuth(),
  component: App,
  getParentRoute: () => rootRoute,
  path: "/",
});

const errorRoute = createRoute({
  component: bigError,
  getParentRoute: () => rootRoute,
  path: "/error",
});

const authRoute = createRoute({
  component: AuthPage,
  getParentRoute: () => rootRoute,
  path: "/auth",
});
const menuRoute = createRoute({
  beforeLoad: requireAuth(),
  component: MenuPage,
  getParentRoute: () => rootRoute,
  path: "/menu",
  pendingComponent: BigLoader,
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
