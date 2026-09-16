import { useRef, useState } from "react";

import type { CanvasTool } from "@/types/canvas";

export const useCanvasTool = (initialTool: CanvasTool = "draw") => {
  const [tool, setTool] = useState<CanvasTool>(initialTool);
  const previousToolRef = useRef<CanvasTool>(initialTool);

  const selectTool = (next: CanvasTool) => {
    // picking the eyedropper again must not remember itself: after a colour
    // is picked the canvas returns to the tool used for drawing
    if (next === "eyedropper" && tool !== "eyedropper") {
      previousToolRef.current = tool;
    }
    setTool(next);
  };

  const cancelTool = () => setTool(previousToolRef.current);

  return { cancelTool, selectTool, tool };
};
