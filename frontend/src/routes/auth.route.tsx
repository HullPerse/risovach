import { useState } from "react";

import { WindowComponent } from "@/components/shared/window.component";
import type { AuthTab } from "@/types/app/auth";

import { LoginAuth } from "./auth/login.auth";
import { RegisterAuth } from "./auth/register.auth";

const AUTH_TITLES: Record<AuthTab, string> = {
  login: "ВХОД",
  register: "РЕГИСТРАЦИЯ",
};

const AuthPage = () => {
  const [tab, setTab] = useState<AuthTab>("login");

  return (
    <WindowComponent
      label={AUTH_TITLES[tab]}
      className="absolute top-1/2 right-1/2 translate-x-1/2 -translate-y-1/2"
    >
      <section className="flex w-full flex-col items-center gap-2">
        {tab === "login" ? (
          <LoginAuth setTab={setTab} />
        ) : (
          <RegisterAuth setTab={setTab} />
        )}
      </section>
    </WindowComponent>
  );
};

export default AuthPage;
