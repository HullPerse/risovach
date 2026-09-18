import { useState, type ReactNode } from "react";

import type { AuthTab, RegisterStep } from "@/types/app/auth";

import CanvasRegister from "./components/canvasRegister.component";
import DataRegister from "./components/dataRegister.component";
import PreviewRegister from "./components/previewRegister.component";

export const RegisterAuth = ({
  setTab,
}: {
  setTab: (value: AuthTab) => void;
}) => {
  const [currentTab, setCurrentTab] = useState<RegisterStep>("data");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const handleCreate = (file: File | null) => {
    setAvatarFile(file);
    setCurrentTab("preview");
  };

  const getComponent = () => {
    const tabMap: Record<RegisterStep, ReactNode> = {
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
          password={password}
        />
      ),
    };

    return tabMap[currentTab];
  };

  return (
    <main className="flex w-full flex-col items-center gap-2">
      {getComponent()}
    </main>
  );
};
