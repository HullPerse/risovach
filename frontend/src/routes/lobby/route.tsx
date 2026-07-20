import { createFileRoute, Outlet } from "@tanstack/react-router";
import { WindowComponent } from "@/components/shared/window.component";

export const Route = createFileRoute("/lobby")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <WindowComponent
      label="ЛОББИ"
      showBack
      className="absolute top-1/2 right-1/2 translate-x-1/2 -translate-y-1/2"
    >
      <Outlet />
    </WindowComponent>
  );
}
