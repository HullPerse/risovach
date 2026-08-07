import { Button } from "@/components/ui/button.component";
import { Input } from "@/components/ui/input.component";
import { Switch } from "@/components/ui/switch.component";
import { useMemo } from "react";

function PreviewRegister({
  setCurrentTab,
  username,
  avatarFile,
  background,
  setBackground,
  password,
  confirmPassword,
  setConfirmPassword,
}: {
  setCurrentTab: (value: "data" | "canvas" | "preview") => void;
  username: string;
  avatarFile: File | null;
  background: "transparent" | "white";
  setBackground: (value: "transparent" | "white") => void;
  password: string;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
}) {
  const avatarUrl = useMemo(
    () => (avatarFile ? URL.createObjectURL(avatarFile) : null),
    [avatarFile],
  );

  return (
    <main className="flex flex-col gap-2 items-center w-full">
      <div className="w-full border-2 border-border boxShadow bg-background">
        <section className="flex flex-row w-full gap-1 bg-primary border-b-2 border-border p-1 items-center justify-center select-none">
          <span className="font-bold text-sm">Превью</span>
        </section>
        <div className="p-4 flex flex-col items-center gap-3">
          <div
            className="size-24 border-2 border-border boxShadowSmall overflow-hidden"
            style={{
              background: background === "white" ? "#ffffff" : "transparent",
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Аватар"
                className="size-full object-cover"
              />
            ) : null}
          </div>
          <span className="font-bold">
            {username ? `@${username}` : "@username"}
          </span>
        </div>
      </div>

      <div className="flex flex-row items-center justify-between w-full border-2 border-border boxShadowSmall bg-background p-2 select-none">
        <span className="text-xs font-bold uppercase tracking-widest text-muted">
          Белый фон
        </span>
        <Switch
          checked={background === "white"}
          onCheckedChange={(checked) =>
            setBackground(checked ? "white" : "transparent")
          }
          aria-label="Белый фон"
        />
      </div>

      <div className="flex flex-col leading-tight w-full">
        <label className="text-muted text-xs">Подтвердите пароль</label>
        <Input
          type="password"
          min={4}
          max={24}
          value={confirmPassword}
          onChange={(e) =>
            setConfirmPassword(e.target.value.replace(/\s+/g, ""))
          }
        />
      </div>

      <div className="flex flex-row gap-2 items-center w-full">
        <Button variant="error" onClick={() => setCurrentTab("canvas")}>
          Назад
        </Button>
        <Button
          variant="success"
          className="w-full"
          disabled={!password || confirmPassword !== password}
        >
          Создать аккаунт
        </Button>
      </div>
    </main>
  );
}

export default PreviewRegister;
