import { useCallback, useState, type JSX } from "react";
import DataRegister from "./components/data.register";
import CanvasRegister from "./components/canvas.register";
import PreviewRegister from "./components/preview.register";

export function RegisterAuth({
  setTab,
}: {
  setTab: (value: "login" | "register") => void;
}) {
  const [currentTab, setCurrentTab] = useState<"data" | "canvas" | "preview">(
    "data",
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [background, setBackground] = useState<"transparent" | "white">(
    "white",
  );

  const handleCreate = useCallback((file: File | null) => {
    setAvatarFile(file);
    setCurrentTab("preview");
  }, []);

  const getComponent = () => {
    const tabMap = {
      data: (
        <DataRegister
          setTab={setTab}
          setCurrentTab={setCurrentTab}
          username={username}
          setUsername={setUsername}
          password={password}
          setPassword={setPassword}
        />
      ),
      canvas: (
        <CanvasRegister setCurrentTab={setCurrentTab} onCreate={handleCreate} />
      ),
      preview: (
        <PreviewRegister
          setCurrentTab={setCurrentTab}
          username={username}
          avatarFile={avatarFile}
          background={background}
          setBackground={setBackground}
          password={password}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
        />
      ),
    } as Record<string, JSX.Element>;

    return tabMap[currentTab];
  };

  return (
    <main className="flex flex-col gap-2 items-center w-full">
      {getComponent()}
    </main>
  );
}
