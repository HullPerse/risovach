import { Outlet, useNavigate } from "@tanstack/react-router";
import { Suspense, useEffect } from "react";

import DotsBackground from "@/components/shared/dots.component";
import { useUserStore } from "@/stores/user.store";

import { BigLoader } from "./components/shared/loader.component";

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

      if (!useUserStore.getState().user) {
        navigate({ replace: true, to: "/auth" });
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [navigate]);

  return (
    <main
      className="bg-background relative h-screen w-screen overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
    >
      <DotsBackground />

      <Suspense fallback={<BigLoader />}>
        <div className="pointer-events-none relative z-10 h-full w-full">
          <Outlet />
        </div>
      </Suspense>
    </main>
  );
};

export default App;
