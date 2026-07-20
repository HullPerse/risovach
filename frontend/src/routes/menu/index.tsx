import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { BigLoader } from "@/components/shared/loader.component";

const App = lazy(() => import("@/App"));

export const Route = createFileRoute("/menu/")({
  component: App,
  pendingComponent: BigLoader,
});
