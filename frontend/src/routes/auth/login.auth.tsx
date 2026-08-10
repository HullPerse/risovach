import { useState } from "react";

import RevealableError from "@/components/shared/reveal.component";
import { Button } from "@/components/ui/button.component";
import { Input } from "@/components/ui/input.component";
import { useLogin } from "@/hooks/user/auth.hook";
import { loginSchema } from "@/lib/zod.utils";

export const LoginAuth = ({
  setTab,
}: {
  setTab: (value: "login" | "register") => void;
}) => {
  const login = useLogin();

  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const loading = login.isPending;

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

  let errorContent: React.ReactNode = null;
  if (validationError) {
    errorContent = (
      <span className="text-error text-xs">{validationError}</span>
    );
  } else if (login.error) {
    errorContent = <RevealableError error={login.error} />;
  }

  return (
    <form
      className="flex w-full flex-col items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        handleLogin();
      }}
    >
      <div className="flex w-full flex-col leading-tight">
        <label htmlFor="login-username" className="text-muted text-xs">
          Имя пользователя
        </label>
        <Input
          id="login-username"
          type="text"
          min={4}
          max={24}
          amount
          value={username}
          onChange={(e) => setUsername(e.target.value.replaceAll(/\s+/gu, ""))}
          autoFocus
        />
      </div>
      <div className="flex w-full flex-col leading-tight">
        <label htmlFor="login-password" className="text-muted text-xs">
          Пароль
        </label>
        <Input
          id="login-password"
          type="password"
          min={4}
          max={24}
          value={password}
          onChange={(e) => setPassword(e.target.value.replaceAll(/\s+/gu, ""))}
        />
      </div>
      <Button type="submit" className="w-full" loading={loading}>
        Войти
      </Button>
      {errorContent}

      <div className="flex flex-row items-center gap-1 leading-tight">
        <span className="text-muted text-xs">Ещё нет аккаунта?</span>
        <Button
          variant="link"
          className="w-16 text-xs"
          onClick={() => setTab("register")}
        >
          Создать
        </Button>
      </div>
    </form>
  );
};
