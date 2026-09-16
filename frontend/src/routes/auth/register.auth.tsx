import { useState } from "react";
import type { ReactNode } from "react";

import CanvasRegister from "./components/canvas.register";
import DataRegister from "./components/data.register";
import PreviewRegister from "./components/preview.register";

export const RegisterAuth = ({
  setTab,
}: {
  setTab: (value: "login" | "register") => void;
}) => {
  const [currentTab, setCurrentTab] = useState<"data" | "canvas" | "preview">(
    "data"
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const handleCreate = (file: File | null) => {
    setAvatarFile(file);
    setCurrentTab("preview");
  };

  const getComponent = () => {
    const tabMap: Record<string, ReactNode> = {
      canvas: (
        <CanvasRegister setCurrentTab={setCurrentTab} onCreate={handleCreate} />
      ),
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
      preview: (
        <PreviewRegister
          setCurrentTab={setCurrentTab}
          username={username}
          avatarFile={avatarFile}
          password={password}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
        />
      ),
    };

    return tabMap[currentTab];
  };

  return (
    <div className="flex w-full flex-col items-center gap-2">
      {getComponent()}
    </div>
  );
};
