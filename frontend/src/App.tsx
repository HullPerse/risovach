import { Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import {
  HandCoins,
  MessageCircleWarning,
  MessageSquareText,
  Settings,
} from "lucide-react";
import { Suspense, useEffect, type ReactNode } from "react";

import DotsBackground from "@/components/shared/dots.component";
import { useMenuStore } from "@/stores/menu.store";
import { useUserStore } from "@/stores/user.store";

import { BigLoader } from "./components/shared/loader.component";
import GithubSvg from "./components/svg/github.icon";
import { Button } from "./components/ui/button.component";
import { MenuButtons } from "./config/menu.config";
import type { MenuButton } from "./types/menu";

const App = () => {
  const activeView = useMenuStore((state) => state.activeView);
  const toggleView = useMenuStore((state) => state.toggleView);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const user = useUserStore((state) => state.user);

  const isMenuRoute = pathname === "/menu";

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

  const getIcon = (value: MenuButton["value"]) => {
    const iconMap = {
      chat: <MessageSquareText className="size-6 fill-white" />,
      report: <MessageCircleWarning className="size-6 fill-white" />,
      settings: <Settings className="size-6 fill-white" />,
      donation: <HandCoins className="size-6 fill-white" />,
      github: <GithubSvg className="size-6" />,
    } as Record<MenuButton["value"], ReactNode>;

    return iconMap[value];
  };

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

      {/*BUTTONS*/}
      {isMenuRoute && (
        <section className="absolute right-6 bottom-8 flex flex-row gap-2">
          {MenuButtons.map((item) => (
            <Button
              key={item.value}
              size="icon"
              className="size-8"
              title={item.label}
              disabled={(() => {
                if (!user) return true;
                if (["settings", "donation", "chat"].includes(item.value)) {
                  return activeView === item.value;
                }
                return false;
              })()}
              onClick={() => {
                if (!user) return;

                const githubLink = "https://github.com/hullperse/risovach";
                const issuesLink =
                  "https://github.com/hullperse/risovach/issues";

                if (item.value === "github") return window.open(githubLink);
                if (item.value === "report") return window.open(issuesLink);
                if (["settings", "donation", "chat"].includes(item.value)) {
                  return toggleView(
                    item.value as "settings" | "donation" | "chat"
                  );
                }
              }}
            >
              {getIcon(item.value)}
            </Button>
          ))}
        </section>
      )}
    </main>
  );
};

export default App;
