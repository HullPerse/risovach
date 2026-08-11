import type { VariantProps } from "class-variance-authority";
import { useEffect, useState, type ReactNode } from "react";

import { UserApi } from "@/api/user.api";
import ImageComponent from "@/components/shared/image.component";
import { SmallLoader } from "@/components/shared/loader.component";
import { WindowComponent } from "@/components/shared/window.component";
import { Button } from "@/components/ui/button.component";
import type { buttonVariants } from "@/components/ui/button.variants";
import { useLogout } from "@/hooks/user/auth.hook";
import { cn } from "@/lib/index.utils";
import { useMenuStore } from "@/stores/menu.store";
import { useUserStore } from "@/stores/user.store";
import type { MenuView } from "@/types/menu";

import ChatMenu from "./menu/chat.menu";
import DonationMenu from "./menu/donation.menu";
import SettingsMenu from "./menu/settings.menu";

const TABS = [
  { label: "Профиль", value: "profile", variant: "success" },
  { label: "Создать лобби", value: "create", variant: "default" },
  { label: "Найти лобби", value: "find", variant: "default" },
  { label: "Выйти из аккаунта", value: "leave", variant: "error" },
] as const satisfies {
  label: string;
  value: string;
  variant: VariantProps<typeof buttonVariants>["variant"];
}[];

const VIEWS: Record<
  Exclude<MenuView, "main">,
  { label: string; component: () => ReactNode }
> = {
  settings: { label: "ПАРАМЕТРЫ", component: SettingsMenu },
  donation: { label: "ПОДПИСКА", component: DonationMenu },
  chat: { label: "ЧАТ", component: ChatMenu },
};

const MenuPage = () => {
  const logout = useLogout();
  const { user } = useUserStore();
  const activeView = useMenuStore((state) => state.activeView);
  const setActiveView = useMenuStore((state) => state.setActiveView);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);

    setTimeout(() => setLoading(false), 1000);
  }, []);

  if (activeView !== "main") {
    const view = VIEWS[activeView];
    const Component = view.component;

    return (
      <WindowComponent
        label={view.label}
        onBack={() => setActiveView("main")}
        className="absolute top-1/2 right-1/2 translate-x-1/2 -translate-y-1/2"
        childrenClassName="flex w-full py-2"
      >
        <Component />
      </WindowComponent>
    );
  }

  return (
    <WindowComponent
      label="МЕНЮ"
      className="absolute top-1/2 right-1/2 translate-x-1/2 -translate-y-1/2"
      childrenClassName="flex flex-col gap-2 w-full py-2"
    >
      {TABS.map((tab) => (
        <Button
          key={tab.value}
          variant={tab.variant}
          className={cn("border-border relative w-full")}
          onClick={() => {
            if (tab.value === "leave") logout.mutate();
          }}
        >
          {tab.value === "find" && (
            <div
              title="Количество активных лобби"
              className="border-border boxShadowSmall bg-card absolute top-1/2 left-2 flex h-6 -translate-y-1/2 items-center justify-center border-2"
              style={{
                minWidth: "1.5rem",
                width: loading ? "5rem" : "auto",
              }}
            >
              {loading ? <SmallLoader /> : Math.floor(17)}
            </div>
          )}

          {tab.value === "profile" && (
            <ImageComponent
              src={user ? UserApi.avatarUrl(user, "thumb") : ""}
              alt="profile"
              className="border-border boxShadowSmall bg-card absolute top-1/2 left-2 size-6 -translate-y-1/2 border-2"
            />
          )}
          {tab.label}
        </Button>
      ))}
    </WindowComponent>
  );
};

export default MenuPage;
