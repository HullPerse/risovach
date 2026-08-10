import { useState } from "react";
import type { JSX } from "react";

import { WindowComponent } from "@/components/shared/window.component";

import { LoginAuth } from "./auth/login.auth";
import { RegisterAuth } from "./auth/register.auth";

const AuthPage = () => {
  const [tab, setTab] = useState<"login" | "register">("login");

  const tabMap: Record<string, JSX.Element> = {
    login: <LoginAuth setTab={setTab} />,
    register: <RegisterAuth setTab={setTab} />,
  };

  return (
    <WindowComponent
      label={tab === "login" ? "ВХОД" : "РЕГИСТРАЦИЯ"}
      className="absolute top-1/2 right-1/2 translate-x-1/2 -translate-y-1/2"
    >
      <div className="flex w-full flex-col items-center gap-2">
        {tabMap[tab]}
      </div>
    </WindowComponent>
  );
};

export default AuthPage;
