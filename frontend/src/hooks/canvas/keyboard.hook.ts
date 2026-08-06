import { useEffect, useRef } from "react";
import { useCanvasStore } from "@/stores/canvas.store";
import type { CanvasTool } from "@/types/canvas";

export function useCanvasKeyboard(
  onToolChange?: (tool: CanvasTool) => void,
  onCancelTool?: () => void,
  tool?: CanvasTool,
) {
  const onToolChangeRef = useRef(onToolChange);
  const onCancelToolRef = useRef(onCancelTool);
  const toolRef = useRef(tool);

  onToolChangeRef.current = onToolChange;
  onCancelToolRef.current = onCancelTool;

  toolRef.current = tool;

  const keyFunction = (e: KeyboardEvent, execute: () => void) => {
    e.preventDefault();
    execute();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const store = useCanvasStore.getState();

      const target = e.target as HTMLElement;
      const targetValues = "input, textarea, select, [contenteditable]";

      if (target?.closest?.(targetValues)) return;

      const keybindMap = {
        Space: () => keyFunction(e, () => store.setIsSpacePressed(true)),
        Alt: () => keyFunction(e, () => store.setIsAltPressed(true)),
        Escape: () => {
          if (toolRef.current === "eyedropper") {
            keyFunction(e, () => onCancelToolRef.current?.());
          }
        },
      } as Record<string, () => void>;

      const keyMap = {
        b: () => keyFunction(e, () => onToolChangeRef.current?.("draw")),
        e: () => keyFunction(e, () => onToolChangeRef.current?.("eraser")),
        i: () => keyFunction(e, () => onToolChangeRef.current?.("eyedropper")),
      } as Record<string, () => void>;

      const key = e.key.toLowerCase();
      const code = e.code.startsWith("Alt") ? "Alt" : e.code;

      if (key in keyMap) return keyMap[key]();
      return keybindMap[code]?.();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const store = useCanvasStore.getState();

      if (e.code === "Space") store.setIsSpacePressed(false);
      else if (e.key === "Alt") store.setIsAltPressed(false);
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
}
