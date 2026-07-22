import { Button } from "@/components/ui/button.component";
import { Input } from "@/components/ui/input.component";
import { useState } from "react";

function DataRegister({
  setTab,
  setCurrentTab,
}: {
  setTab: (value: "login" | "register") => void;
  setCurrentTab: (value: "data" | "canvas") => void;
}) {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  return (
    <main className="flex flex-col gap-2 items-center w-full">
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

      <Button
        onClick={() => {
          setCurrentTab("canvas");
        }}
        className="w-full"
      >
        Создать аватар
      </Button>

      <div className="flex flex-row gap-1 items-center leading-tight">
        <span className="text-xs text-muted">Уже есть аккаунт?</span>
        <Button
          variant="link"
          className="w-16 text-xs"
          onClick={() => setTab("login")}
        >
          Войти
        </Button>
      </div>
    </main>
  );
}

export default DataRegister;
