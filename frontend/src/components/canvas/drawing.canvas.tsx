import type { Ref } from "react";
import { useImperativeHandle } from "react";

import { useDrawingCanvas } from "@/hooks/canvas/drawing.hook";
import { useDrawingInput } from "@/hooks/canvas/input.hook";
import { cn } from "@/lib/index.utils";
import type {
  DrawingCanvasAPI,
  DrawingCanvasProps,
} from "@/types/engine/drawing";

export const DrawingCanvas = ({
  brush,
  className,
  documentSize,
  onColorPick,
  onStateChange,
  onToolCancel,
  onToolChange,
  tool,
  zoomLimits,
  ref,
}: DrawingCanvasProps & { ref?: Ref<DrawingCanvasAPI | null> }) => {
  const {
    api,
    bridge,
    containerRef,
    overlayRef,
    overlayState,
    requestRender,
    surfaceRef,
  } = useDrawingCanvas({
    brush,
    documentSize,
    onStateChange,
    tool,
    zoomLimits,
  });

  useDrawingInput({
    bridge,
    containerRef,
    onColorPick,
    onToolCancel,
    onToolChange,
    overlayState,
    requestRender,
  });

  useImperativeHandle(ref, () => api);

  return (
    <div
      ref={containerRef}
      className={cn(
        "border-border relative touch-none overflow-hidden border-2 select-none",
        className
      )}
      style={{ cursor: "crosshair" }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <canvas ref={surfaceRef} className="absolute inset-0 block" />
      <canvas
        ref={overlayRef}
        className="pointer-events-none absolute inset-0 block"
      />
    </div>
  );
};
