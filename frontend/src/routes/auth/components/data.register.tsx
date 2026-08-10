import { Button } from "@/components/ui/button.component";
import { Input } from "@/components/ui/input.component";

const DataRegister = ({
  setTab,
  setCurrentTab,
  username,
  setUsername,
  password,
  setPassword,
}: {
  setTab: (value: "login" | "register") => void;
  setCurrentTab: (value: "data" | "canvas" | "preview") => void;
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
        if (canSubmit) {
          setCurrentTab("canvas");
        }
      }}
    >
      <div className="flex w-full flex-col leading-tight">
        <label htmlFor="register-username" className="text-muted text-xs">
          Имя пользователя
        </label>
        <Input
          id="register-username"
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
        <label htmlFor="register-password" className="text-muted text-xs">
          Пароль
        </label>
        <Input
          id="register-password"
          type="password"
          min={4}
          max={24}
          value={password}
          onChange={(e) => setPassword(e.target.value.replaceAll(/\s+/gu, ""))}
        />
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={
          !username || username.length < 4 || !password || password.length < 4
        }
      >
        Создать аватар
      </Button>

      <div className="flex flex-row items-center gap-1 leading-tight">
        <span className="text-muted text-xs">Уже есть аккаунт?</span>
        <Button
          variant="link"
          className="w-16 text-xs"
          onClick={() => setTab("login")}
        >
          Войти
        </Button>
      </div>
    </form>
  );
};

export default DataRegister;
