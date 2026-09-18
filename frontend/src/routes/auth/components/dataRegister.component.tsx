import { Button } from "@/components/ui/button.component";
import type { AuthTab, RegisterStep } from "@/types/app/auth";

import { AuthField } from "./authField.component";
import { AuthSwitch } from "./authSwitch.component";

const DataRegister = ({
  setTab,
  setCurrentTab,
  username,
  setUsername,
  password,
  setPassword,
}: {
  setTab: (value: AuthTab) => void;
  setCurrentTab: (value: RegisterStep) => void;
  username: string;
  setUsername: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
}) => {
  const canSubmit = username.length >= 4 && password.length >= 4;

  return (
    <form
      className="flex w-full flex-col items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) setCurrentTab("canvas");
      }}
    >
      <AuthField
        id="register-username"
        label="Имя пользователя"
        type="text"
        value={username}
        onChange={setUsername}
        autoFocus
        amount
      />
      <AuthField
        id="register-password"
        label="Пароль"
        type="password"
        value={password}
        onChange={setPassword}
      />

      <Button type="submit" className="w-full" disabled={!canSubmit}>
        Создать аватар
      </Button>

      <AuthSwitch
        hint="Уже есть аккаунт?"
        action="Войти"
        onSwitch={() => setTab("login")}
      />
    </form>
  );
};

export default DataRegister;
