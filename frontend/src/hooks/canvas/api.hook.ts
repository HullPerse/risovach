import { useCanvasStore } from "@/stores/canvas.store";
import type { CanvasAPI, RequestImageOptions } from "@/types/canvas";

export const useCanvasAPI = (
  resetView: () => void,
  requestImage: (options?: RequestImageOptions) => Promise<File | null>
): CanvasAPI => {
  const canUndo = useCanvasStore((s) => s.canUndo);
  const canRedo = useCanvasStore((s) => s.canRedo);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const clear = useCanvasStore((s) => s.clear);

  return { canRedo, canUndo, clear, redo, requestImage, resetView, undo };
};
