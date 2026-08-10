import { Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { useUserStore } from "@/stores/user.store";

const App = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const onVisible = async () => {
      if (document.visibilityState !== "visible") return;

      if (!useUserStore.getState().user) return;

      try {
        await useUserStore.getState().refresh();
      } catch {
        return;
      }

      if (!useUserStore.getState().user)
        navigate({ replace: true, to: "/auth" });
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [navigate]);

  return (
    <div
      className="bg-background relative h-screen w-screen overflow-hidden"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='1.5' fill='%23000000' fill-opacity='0.5' /%3E%3C/svg%3E")`,
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Outlet />
    </div>
  );
};

export default App;
