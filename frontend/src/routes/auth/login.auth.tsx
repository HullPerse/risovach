import { useState } from "react";

import { Button } from "@/components/ui/button.component";
import { useLogin } from "@/hooks/user/auth.hook";
import { loginSchema } from "@/lib/schemas/auth.schema";
import type { AuthTab } from "@/types/app/auth";

import { AuthError } from "./components/authError.component";
import { AuthField } from "./components/authField.component";
import { AuthSwitch } from "./components/authSwitch.component";

export const LoginAuth = ({ setTab }: { setTab: (value: AuthTab) => void }) => {
  const login = useLogin();

  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleLogin = () => {
    setValidationError(null);
    const result = loginSchema.safeParse({ password, username });
    if (!result.success) {
      setValidationError(
        result.error.issues[0]?.message ?? "Проверьте введённые данные"
      );
      return;
    }
    login.mutate({ password, username });
  };

  return (
    <form
      className="flex w-full flex-col items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        handleLogin();
      }}
    >
      <AuthField
        id="login-username"
        label="Имя пользователя"
        type="text"
        value={username}
        onChange={setUsername}
        autoFocus
        amount
      />
      <AuthField
        id="login-password"
        label="Пароль"
        type="password"
        value={password}
        onChange={setPassword}
      />
      <Button type="submit" className="w-full" loading={login.isPending}>
        Войти
      </Button>
      <AuthError validationError={validationError} error={login.error} />

      <AuthSwitch
        hint="Ещё нет аккаунта?"
        action="Создать"
        onSwitch={() => setTab("register")}
      />
    </form>
  );
};
