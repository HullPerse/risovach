import { useState, type JSX } from "react";
import { LoginAuth } from "./auth/login.auth";
import { RegisterAuth } from "./auth/register.auth";
import { WindowComponent } from "@/components/shared/window.component";

function AuthPage() {
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
      <main className="flex flex-col gap-2 items-center w-full">
        {tabMap[tab]}
      </main>
    </WindowComponent>
  );
}

export default AuthPage;
