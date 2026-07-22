import { useState, type JSX } from "react";
import DataRegister from "./components/data.register";
import CanvasRegister from "./components/canvas.register";

export function RegisterAuth({
  setTab,
}: {
  setTab: (value: "login" | "register") => void;
}) {
  const [currentTab, setCurrentTab] = useState<"data" | "canvas">("data");

  const getComponent = () => {
    const tabMap = {
      data: <DataRegister setTab={setTab} setCurrentTab={setCurrentTab} />,
      canvas: <CanvasRegister setCurrentTab={setCurrentTab} />,
    } as Record<string, JSX.Element>;

    return tabMap[currentTab];
  };

  return (
    <main className="flex flex-col gap-2 items-center w-full">
      {getComponent()}
    </main>
  );
}
