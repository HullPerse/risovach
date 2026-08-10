import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { lazy } from "react";

import { bigError, bigLoader } from "@/components/shared/error.component";
import { initializeUserStore, useUserStore } from "@/stores/user.store";

import AuthPage from "./auth.route";
import Menu from "./menu.route";

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
  pendingComponent: bigLoader,
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
  component: Menu,
  getParentRoute: () => rootRoute,
  path: "/menu",
  pendingComponent: bigLoader,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  authRoute,
  menuRoute,
  errorRoute,
]);

export const router = createRouter({ routeTree });
