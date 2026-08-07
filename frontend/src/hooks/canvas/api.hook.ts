import { useMemo } from "react";
import { useCanvasStore } from "@/stores/canvas.store";
import type { CanvasAPI, RequestImageOptions } from "@/types/canvas";

export function useCanvasAPI(
  resetView: () => void,
  requestImage: (options?: RequestImageOptions) => Promise<File | null>,
): CanvasAPI {
  const canUndo = useCanvasStore((s) => s.canUndo);
  const canRedo = useCanvasStore((s) => s.canRedo);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const clear = useCanvasStore((s) => s.clear);

  return useMemo(
    () => ({ undo, redo, clear, resetView, canUndo, canRedo, requestImage }),
    [undo, redo, clear, resetView, canUndo, canRedo, requestImage],
  );
}
