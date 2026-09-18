import { useEffect, useState } from "react";

import { EmptyError } from "@/components/shared/error.component";
import { SmallLoader } from "@/components/shared/loader.component";
import { WindowComponent } from "@/components/shared/window.component";
import { Button } from "@/components/ui/button.component";
import { useLogout } from "@/hooks/user/auth.hook";
import { cn } from "@/lib/index.utils";
import { useMenuStore } from "@/stores/menu.store";
import type { MenuButtons, MenuTabs } from "@/types/app/menu";

import ChatMenu from "./menu/chat.menu";
import MenuAvatar from "./menu/components/avatar.menu";
import CreateMenu from "./menu/create.menu";
import DonationMenu from "./menu/donation.menu";
import SettingsMenu from "./menu/settings.menu";

const TABS: MenuTabs[] = [
  { label: "Профиль", value: "profile", variant: "success" },
  { label: "Создать лобби", value: "create", variant: "default" },
  { label: "Найти лобби", value: "find", variant: "default" },
  { label: "Выйти из аккаунта", value: "leave", variant: "error" },
];

const VIEWS: MenuButtons = {
  settings: { label: "ПАРАМЕТРЫ", component: SettingsMenu },
  donation: { label: "ПОДПИСКА", component: DonationMenu },
  chat: { label: "ЧАТ", component: ChatMenu },
  profile: { label: "ПРОФИЛЬ", component: EmptyError },
  create: { label: "СОЗДАТЬ ЛОББИ", component: CreateMenu },
  find: { label: "НАЙТИ ЛОББИ", component: EmptyError },
};

const MenuPage = () => {
  const logout = useLogout();
  const activeView = useMenuStore((state) => state.activeView);
  const setActiveView = useMenuStore((state) => state.setActiveView);
  const toggleView = useMenuStore((state) => state.toggleView);

  const [loading, setLoading] = useState<boolean>(true);

  //lobby counter
  useEffect(() => {
    const id = window.setTimeout(() => setLoading(false), 1000);

    return () => window.clearTimeout(id);
  }, []);

  if (activeView !== "main") {
    const view = VIEWS[activeView];

    return (
      <WindowComponent
        label={view.label}
        onBack={() => setActiveView("main")}
        className="absolute top-1/2 right-1/2 translate-x-1/2 -translate-y-1/2"
        childrenClassName="flex w-full py-2"
      >
        <view.component />
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
            if (tab.value === "leave") return logout.mutate();
            return toggleView(tab.value);
          }}
        >
          {tab.value === "find" && (
            <section
              title="Количество активных лобби"
              className="border-border boxShadowSmall bg-card absolute top-1/2 left-2 flex h-6 -translate-y-1/2 items-center justify-center border-2"
              style={{
                minWidth: "1.5rem",
                width: loading ? "5rem" : "auto",
              }}
            >
              {loading ? <SmallLoader /> : Math.floor(17)}
            </section>
          )}

          {tab.value === "profile" && <MenuAvatar />}
          {tab.label}
        </Button>
      ))}
    </WindowComponent>
  );
};

export default MenuPage;
