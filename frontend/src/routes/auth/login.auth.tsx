import { Button } from "@/components/ui/button.component";
import { Input } from "@/components/ui/input.component";
import { useAuthStore } from "@/stores/auth.store";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export function LoginAuth({
  setTab,
}: {
  setTab: (value: "login" | "register") => void;
}) {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);

  const handleLogin = () => {
    setLoading(true);
  };

  return (
    <main
      className="flex flex-col gap-2 items-center w-full"
      onKeyDown={(e) => {
        if (e.code === "Enter") return handleLogin();
      }}
    >
      <div className="flex flex-col leading-tight w-full">
        <label className="text-muted text-xs">Имя пользователя</label>
        <Input
          type="text"
          min={4}
          max={24}
          amount
          value={username}
          onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ""))}
          autoFocus
        />
      </div>
      <div className="flex flex-col leading-tight w-full">
        <label className="text-muted text-xs">Пароль</label>
        <Input
          type="password"
          min={4}
          max={24}
          value={password}
          onChange={(e) => setPassword(e.target.value.replace(/\s+/g, ""))}
        />
      </div>
      <Button onClick={handleLogin} className="w-full" loading={loading}>
        Войти
      </Button>

      <div className="flex flex-row gap-1 items-center leading-tight">
        <span className="text-xs text-muted">Ещё нет аккаунта?</span>
        <Button
          variant="link"
          className="w-16 text-xs"
          onClick={() => setTab("register")}
        >
          Создать
        </Button>
      </div>
    </main>
  );
}
