import { useEffect, useRef } from "react";

import { useCanvasStore } from "@/stores/canvas.store";
import type { CanvasTool } from "@/types/canvas";

export const useCanvasKeyboard = (
  onToolChange?: (tool: CanvasTool) => void,
  onCancelTool?: () => void,
  tool?: CanvasTool
) => {
  const onToolChangeRef = useRef(onToolChange);
  const onCancelToolRef = useRef(onCancelTool);
  const toolRef = useRef(tool);

  useEffect(() => {
    onToolChangeRef.current = onToolChange;
    onCancelToolRef.current = onCancelTool;
    toolRef.current = tool;
  }, [onToolChange, onCancelTool, tool]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const store = useCanvasStore.getState();

      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable]")) {
        return;
      }

      const key = e.key.toLowerCase();
      const code = e.code.startsWith("Alt") ? "alt" : e.code.toLowerCase();

      if (key === "b") {
        e.preventDefault();
        onToolChangeRef.current?.("draw");
        return;
      }
      if (key === "e") {
        e.preventDefault();
        onToolChangeRef.current?.("eraser");
        return;
      }
      if (key === "i") {
        e.preventDefault();
        onToolChangeRef.current?.("eyedropper");
        return;
      }
      if (code === "alt") {
        e.preventDefault();
        store.setIsAltPressed(true);
        return;
      }
      if (code === "space") {
        e.preventDefault();
        store.setIsSpacePressed(true);
        return;
      }
      if (code === "escape" && toolRef.current === "eyedropper") {
        e.preventDefault();
        onCancelToolRef.current?.();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const store = useCanvasStore.getState();

      if (e.code === "Space") {
        store.setIsSpacePressed(false);
      } else if (e.key === "Alt") {
        store.setIsAltPressed(false);
      }
    };

    const handleBlur = () => {
      const store = useCanvasStore.getState();

      store.setIsAltPressed(false);
      store.setIsSpacePressed(false);
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    globalThis.addEventListener("keyup", handleKeyUp);
    globalThis.addEventListener("blur", handleBlur);

    return () => {
      globalThis.removeEventListener("keydown", handleKeyDown);
      globalThis.removeEventListener("keyup", handleKeyUp);
      globalThis.removeEventListener("blur", handleBlur);
    };
  }, []);
};
