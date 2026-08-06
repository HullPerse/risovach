import { useEffect, useMemo, useRef, useCallback } from "react";
import Konva from "konva";
import { useCanvasStore } from "@/stores/canvas.store";
import type {
  Point,
  CanvasAPI,
  CanvasPanningConfig,
  CanvasTool,
} from "@/types/canvas";
import {
  CANVAS_SIZE,
  clampOffset,
  clipPointsToCanvas,
  hexFromPixelComposite,
  hexToRGB,
  isPointInCanvas,
} from "@/lib/canvas.utils";

export function useCanvasKeyboard() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const store = useCanvasStore.getState();
      if (e.code === "Space") {
        e.preventDefault();
        store.setIsSpacePressed(true);
      }
      if (e.key === "Alt") {
        e.preventDefault();
        store.setIsAltPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const store = useCanvasStore.getState();
      if (e.code === "Space") store.setIsSpacePressed(false);
      if (e.key === "Alt") store.setIsAltPressed(false);
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

export function useCanvasToolShortcuts(
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.("input, textarea, select, [contenteditable]")) {
        return;
      }
      if (e.key === "Escape") {
        if (toolRef.current === "eyedropper") {
          e.preventDefault();
          onCancelToolRef.current?.();
        }
        return;
      }
      const key = e.key.toLowerCase();
      if (key === "b") {
        e.preventDefault();
        onToolChangeRef.current?.("draw");
      } else if (key === "e") {
        e.preventDefault();
        onToolChangeRef.current?.("eraser");
      } else if (key === "i") {
        e.preventDefault();
        onToolChangeRef.current?.("eyedropper");
      }
    };
    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, []);
}

export function useCanvasAPI(resetView: () => void): CanvasAPI {
  const canUndo = useCanvasStore((s) => s.canUndo);
  const canRedo = useCanvasStore((s) => s.canRedo);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const clear = useCanvasStore((s) => s.clear);

  return useMemo(
    () => ({ undo, redo, clear, resetView, canUndo, canRedo }),
    [undo, redo, clear, resetView, canUndo, canRedo],
  );
}

interface CanvasInteractionProps {
  dimensions: { width: number; height: number };
  color: string;
  brushSize: number;
  tool: CanvasTool;
  opacity: number;
  brushSizeRange: { min: number; max: number };
  onBrushSizeChange?: (size: number) => void;
  onOpacityChange?: (opacity: number) => void;
  onColorPick?: (color: string) => void;
  onToolChange?: (tool: CanvasTool) => void;
  onToolCancel?: () => void;
  limitToBounds: boolean;
  panning: CanvasPanningConfig;
  centerOnInit: boolean;
  zoomConfig: {
    initialZoom: number;
    zoomStep: number;
    zoomMin: number;
    zoomMax: number;
  };
  drawingLayerRef: React.RefObject<Konva.Layer | null>;
}

export function useCanvasInteraction({
  dimensions,
  color,
  brushSize,
  tool,
  opacity,
  brushSizeRange,
  onBrushSizeChange,
  onOpacityChange,
  onColorPick,
  onToolChange,
  onToolCancel,
  limitToBounds,
  panning,
  centerOnInit,
  zoomConfig,
  drawingLayerRef,
}: CanvasInteractionProps) {
  const panStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const altStartRef = useRef<{
    x: number;
    y: number;
    size: number;
    opacity: number;
  } | null>(null);
  const altLockedAxisRef = useRef<"x" | "y" | null>(null);
  const lastCanvasPosRef = useRef<Point | null>(null);
  const wasOutsideCanvasRef = useRef(false);

  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const brushSizeRef = useRef(brushSize);
  const opacityRef = useRef(opacity);
  const onColorPickRef = useRef(onColorPick);
  const onToolChangeRef = useRef(onToolChange);
  const onToolCancelRef = useRef(onToolCancel);
  toolRef.current = tool;
  colorRef.current = color;
  brushSizeRef.current = brushSize;
  opacityRef.current = opacity;
  onColorPickRef.current = onColorPick;
  onToolChangeRef.current = onToolChange;
  onToolCancelRef.current = onToolCancel;

  const zoomLevel = useCanvasStore((s) => s.zoomLevel);
  const panOffset = useCanvasStore((s) => s.panOffset);
  const isAltPressed = useCanvasStore((s) => s.isAltPressed);
  const mousePos = useCanvasStore((s) => s.mousePos);

  const fitScale = Math.min(
    dimensions.width / CANVAS_SIZE,
    dimensions.height / CANVAS_SIZE,
  );
  const effectiveScale = fitScale * zoomLevel;
  const centerScale = centerOnInit ? effectiveScale : fitScale;
  const effectiveX =
    (dimensions.width - CANVAS_SIZE * centerScale) / 2 + panOffset.x;
  const effectiveY =
    (dimensions.height - CANVAS_SIZE * centerScale) / 2 + panOffset.y;

  const prevAltRef = useRef(isAltPressed);
  useEffect(() => {
    if (!isAltPressed && prevAltRef.current) {
      altStartRef.current = null;
      altLockedAxisRef.current = null;
      const store = useCanvasStore.getState();
      const lastPos = lastCanvasPosRef.current;
      if (lastPos) store.setMousePos(lastPos);
    }
    prevAltRef.current = isAltPressed;
  }, [isAltPressed]);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      const store = useCanvasStore.getState();
      if (store.isDrawing) {
        store.saveStroke(
          toolRef.current,
          colorRef.current,
          brushSizeRef.current,
          opacityRef.current,
        );
      }
      store.setIsDrawing(false);
      store.setIsPanning(false);
      store.setCurrentPoints([]);
      store.setMousePos(null);
      panStartRef.current = null;
    };
    globalThis.addEventListener("mouseup", handleGlobalMouseUp);
    return () => globalThis.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

  const getCanvasPos = (screenPos: Point): Point => ({
    x: (screenPos.x - effectiveX) / effectiveScale,
    y: (screenPos.y - effectiveY) / effectiveScale,
  });

  const samplePixelData = (canvasPos: Point): Uint8ClampedArray | null => {
    const layer = drawingLayerRef.current;
    if (!layer) return null;
    const canvas = layer.getCanvas();
    const screenX = Math.round(canvasPos.x * effectiveScale + effectiveX);
    const screenY = Math.round(canvasPos.y * effectiveScale + effectiveY);
    if (
      screenX < 0 ||
      screenY < 0 ||
      screenX >= canvas.getWidth() ||
      screenY >= canvas.getHeight()
    ) {
      return null;
    }
    try {
      return canvas.getContext().getImageData(screenX, screenY, 1, 1).data;
    } catch {
      return null;
    }
  };

  const samplePixelHex = (canvasPos: Point): string | null => {
    const data = samplePixelData(canvasPos);
    return data ? hexFromPixelComposite(data) : null;
  };

  const resetView = useCallback(() => {
    const clampedZoom = Math.max(
      zoomConfig.zoomMin,
      Math.min(zoomConfig.zoomMax, zoomConfig.initialZoom),
    );
    useCanvasStore.getState().resetView(clampedZoom);
  }, [zoomConfig.initialZoom, zoomConfig.zoomMin, zoomConfig.zoomMax]);

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;

    stage.setPointersPositions(e.evt);
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const store = useCanvasStore.getState();

    const oldScale = effectiveScale;
    const canvasX = (pointer.x - effectiveX) / oldScale;
    const canvasY = (pointer.y - effectiveY) / oldScale;

    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newZoom = Math.max(
      zoomConfig.zoomMin,
      Math.min(
        zoomConfig.zoomMax,
        store.zoomLevel *
          (direction > 0 ? zoomConfig.zoomStep : 1 / zoomConfig.zoomStep),
      ),
    );

    const newScale = fitScale * newZoom;
    const centerScaleAfter = centerOnInit ? newScale : fitScale;
    store.setZoomLevel(newZoom);
    store.setPanOffset(
      clampOffset(
        {
          x:
            pointer.x -
            canvasX * newScale -
            (dimensions.width - CANVAS_SIZE * centerScaleAfter) / 2,
          y:
            pointer.y -
            canvasY * newScale -
            (dimensions.height - CANVAS_SIZE * centerScaleAfter) / 2,
        },
        dimensions,
        centerScaleAfter,
        newScale,
        limitToBounds,
      ),
    );
  };

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.altKey) return;

    const stage = e.target.getStage();
    if (!stage) return;

    const pn = panning ?? {
      allowLeftClickPan: false,
      allowMiddleClickPan: false,
      allowRightClickPan: true,
    };
    const allowLeft = pn.allowLeftClickPan;
    const allowMiddle = pn.allowMiddleClickPan;
    const allowRight = pn.allowRightClickPan;
    const button = e.evt.button;
    const store = useCanvasStore.getState();

    if (toolRef.current === "eyedropper" && (button === 1 || button === 2)) {
      e.evt.preventDefault();
      onToolCancelRef.current?.();
      return;
    }

    const panButton =
      (button === 0 && allowLeft) ||
      (button === 1 && allowMiddle) ||
      (button === 2 && allowRight) ||
      (store.isSpacePressed && button === 0);

    if (panButton) {
      e.evt.preventDefault();
      store.setIsPanning(true);
      const pos = stage.getPointerPosition();
      if (pos) {
        panStartRef.current = {
          pointerX: pos.x,
          pointerY: pos.y,
          offsetX: store.panOffset.x,
          offsetY: store.panOffset.y,
        };
      }
      return;
    }

    if (e.evt.button !== 0) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const canvasPos = getCanvasPos(pos);
    const margin = brushSize + 5;
    if (!isPointInCanvas(canvasPos, margin)) return;

    if (toolRef.current === "eyedropper") {
      const hex = samplePixelHex(canvasPos);
      if (hex) {
        onColorPickRef.current?.(hex);
        onToolChangeRef.current?.("draw");
      }
      return;
    }

    store.setIsDrawing(true);
    store.setCurrentPoints(clipPointsToCanvas([canvasPos]));
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    const store = useCanvasStore.getState();

    if (store.isPanning) {
      const start = panStartRef.current;
      if (start) {
        store.setPanOffset(
          clampOffset(
            {
              x: start.offsetX + (pos.x - start.pointerX),
              y: start.offsetY + (pos.y - start.pointerY),
            },
            dimensions,
            centerScale,
            effectiveScale,
            limitToBounds,
          ),
        );
      }
      return;
    }

    const canvasPos = getCanvasPos(pos);
    lastCanvasPosRef.current = canvasPos;

    if (e.evt.altKey && !store.isDrawing) {
      if (!altStartRef.current) {
        altStartRef.current = {
          x: pos.x,
          y: pos.y,
          size: brushSize,
          opacity,
        };
        store.setMousePos(canvasPos);
        return;
      }
      const start = altStartRef.current;
      const deltaX = pos.x - start.x;
      const deltaY = pos.y - start.y;

      const lockThreshold = 5;
      let lockedAxis = altLockedAxisRef.current;
      if (
        !lockedAxis &&
        (Math.abs(deltaX) >= lockThreshold || Math.abs(deltaY) >= lockThreshold)
      ) {
        lockedAxis = Math.abs(deltaX) >= Math.abs(deltaY) ? "x" : "y";
        altLockedAxisRef.current = lockedAxis;
      }

      if (!lockedAxis) return;

      if (lockedAxis !== "y") {
        const newSize = Math.max(
          brushSizeRange.min,
          Math.min(brushSizeRange.max, Math.round(start.size + deltaX)),
        );
        if (newSize !== brushSize) onBrushSizeChange?.(newSize);
      }
      if (lockedAxis !== "x") {
        const newOpacity = Math.max(
          0,
          Math.min(1, start.opacity - deltaY / 200),
        );
        if (newOpacity !== opacity) onOpacityChange?.(newOpacity);
      }
      return;
    }

    if (!store.isDrawing) {
      store.setMousePos(canvasPos);
      return;
    }

    const margin = brushSize + 5;
    if (!isPointInCanvas(canvasPos, margin)) {
      if (store.currentPoints.length > 0) {
        store.saveStroke(
          toolRef.current,
          colorRef.current,
          brushSizeRef.current,
          opacityRef.current,
        );
        wasOutsideCanvasRef.current = true;
      }
      store.setMousePos(canvasPos);
      return;
    }

    store.setMousePos(canvasPos);

    if (wasOutsideCanvasRef.current) {
      wasOutsideCanvasRef.current = false;
      store.setCurrentPoints(clipPointsToCanvas([canvasPos]));
      return;
    }

    const clipped = clipPointsToCanvas([canvasPos]);
    const prev = store.currentPoints;
    if (prev.length === 0) {
      store.setCurrentPoints(clipped);
    } else {
      store.setCurrentPoints([...prev, clipped[0]]);
    }
  };

  const handleMouseUp = () => {
    const store = useCanvasStore.getState();
    if (!store.isDrawing) return;
    store.setIsDrawing(false);
    wasOutsideCanvasRef.current = false;

    if (store.currentPoints.length === 0) {
      store.setMousePos(null);
      return;
    }

    store.saveStroke(
      toolRef.current,
      colorRef.current,
      brushSizeRef.current,
      opacityRef.current,
    );
  };

  const handleMouseLeave = () => {
    const store = useCanvasStore.getState();
    if (store.isDrawing) {
      store.saveStroke(
        toolRef.current,
        colorRef.current,
        brushSizeRef.current,
        opacityRef.current,
      );
    }
    store.setIsDrawing(false);
    store.setIsPanning(false);
    store.setCurrentPoints([]);
    store.setMousePos(null);
    wasOutsideCanvasRef.current = false;
    panStartRef.current = null;
  };

  let cursorStroke = "black";
  if (mousePos) {
    const data = samplePixelData(mousePos);
    cursorStroke = data && data[3] > 0 ? "white" : "black";
  }

  let hoveredColor: string | null = null;
  if (mousePos && tool === "eyedropper" && isPointInCanvas(mousePos)) {
    hoveredColor = samplePixelHex(mousePos);
  }

  const isAdjusting = isAltPressed && !!altStartRef.current;

  const circleFill = isAdjusting ? hexToRGB(color, opacity) : "transparent";

  return {
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    getCanvasPos,
    resetView,
    effectiveScale,
    effectiveX,
    effectiveY,
    cursorStroke,
    hoveredColor,
    isAdjusting,
    circleFill,
  };
}
