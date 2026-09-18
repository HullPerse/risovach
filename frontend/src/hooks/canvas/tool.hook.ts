import { useCallback, useRef, useState } from "react";

import type { CanvasTool } from "@/types/engine/canvas";

export const useCanvasTool = (initialTool: CanvasTool = "draw") => {
  const [tool, setTool] = useState<CanvasTool>(initialTool);
  const toolRef = useRef<CanvasTool>(initialTool);
  const previousToolRef = useRef<CanvasTool>(initialTool);

  const selectTool = useCallback((next: CanvasTool) => {
    // picking the eyedropper again must not remember itself: after a colour
    // is picked the canvas returns to the tool used for drawing
    if (next === "eyedropper" && toolRef.current !== "eyedropper") {
      previousToolRef.current = toolRef.current;
    }
    toolRef.current = next;
    setTool(next);
  }, []);

  const cancelTool = useCallback(() => {
    toolRef.current = previousToolRef.current;
    setTool(previousToolRef.current);
  }, []);

  return { cancelTool, selectTool, tool };
};
