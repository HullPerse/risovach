import { Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import {
  HandCoins,
  MessageCircleWarning,
  MessageSquareText,
  Settings,
} from "lucide-react";
import { Suspense, useEffect } from "react";
import type { ReactNode } from "react";

import DotsBackground from "@/components/shared/dots.component";
import { attempt } from "@/lib/attempt.utils";
import { useMenuStore } from "@/stores/menu.store";
import { useUserStore } from "@/stores/user.store";

import { BigLoader } from "./components/shared/loader.component";
import GithubSvg from "./components/svg/github.icon";
import { Button } from "./components/ui/button.component";
import { githubLink, issuesLink, MenuButtons } from "./config/menu.config";
import { openLink } from "./lib/index.utils";
import type { MenuButton } from "./types/app/menu";

const ICON_MAP: Record<MenuButton["value"], ReactNode> = {
  chat: <MessageSquareText className="size-6 fill-white" />,
  report: <MessageCircleWarning className="size-6 fill-white" />,
  settings: <Settings className="size-6 fill-white" />,
  donation: <HandCoins className="size-6 fill-white" />,
  github: <GithubSvg className="size-6" />,
};

const App = () => {
  const navigate = useNavigate();

  const activeView = useMenuStore((state) => state.activeView);
  const toggleView = useMenuStore((state) => state.toggleView);
  const user = useUserStore((state) => state.user);
  const { pathname } = useLocation();

  useEffect(() => {
    const refreshOnReturn = async () => {
      if (document.visibilityState !== "visible") return;
      if (!useUserStore.getState().user) return;

      const [, error] = await attempt(useUserStore.getState().refresh());
      if (error) return;

      if (!useUserStore.getState().user) {
        navigate({ replace: true, to: "/auth" });
      }
    };

    const onVisible = () => refreshOnReturn();

    document.addEventListener("visibilitychange", () => refreshOnReturn());
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [navigate]);

  useEffect(() => {
    const suppressMenu = (event: MouseEvent) => event.preventDefault();

    document.addEventListener("contextmenu", suppressMenu);
    return () => document.removeEventListener("contextmenu", suppressMenu);
  }, []);

  return (
    <main className="bg-background relative h-screen w-screen overflow-hidden">
      <DotsBackground />

      <Suspense fallback={<BigLoader />}>
        <div className="pointer-events-none relative z-10 h-full w-full">
          <Outlet />
        </div>
      </Suspense>

      {/*BUTTONS*/}
      {pathname === "/menu" && (
        <section className="absolute right-6 bottom-8 flex flex-row gap-2">
          {MenuButtons.map((item) => (
            <Button
              key={item.value}
              size="icon"
              className="size-8"
              title={item.label}
              disabled={(() => {
                if (!user) return true;

                if (item.value === "settings") return activeView === item.value;
                if (item.value === "donation") return activeView === item.value;
                if (item.value === "chat") return activeView === item.value;

                return false;
              })()}
              onClick={() => {
                if (!user) return;

                if (item.value === "github") return openLink(githubLink);
                if (item.value === "report") return openLink(issuesLink);

                if (item.value === "settings") return toggleView(item.value);
                if (item.value === "donation") return toggleView(item.value);
                if (item.value === "chat") return toggleView(item.value);
              }}
            >
              {ICON_MAP[item.value]}
            </Button>
          ))}
        </section>
      )}
    </main>
  );
};

export default App;
