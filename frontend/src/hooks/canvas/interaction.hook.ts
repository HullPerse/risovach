import { useEffect, useRef } from "react";
import type Konva from "konva";
import { useCanvasStore } from "@/stores/canvas.store";
import type { Point } from "@/types/canvas";
import { CANVAS_SIZE, hexToRGB, isPointInCanvas } from "@/lib/canvas.utils";

import type { CanvasInteractionProps } from "@/types/canvas";
import { CanvasViewport } from "@/api/canvas/viewport.api";
import { CanvasDrawing } from "@/api/canvas/drawing.api";
import { CanvasAltAdjust } from "@/api/canvas/alt.api";
import { CanvasEyedropper } from "@/api/canvas/dropper.api";

export function useCanvasInteraction(props: CanvasInteractionProps) {
  const viewportRef = useRef<CanvasViewport | null>(null);
  const drawingRef = useRef<CanvasDrawing | null>(null);
  const altAdjustRef = useRef<CanvasAltAdjust | null>(null);
  const eyedropperRef = useRef<CanvasEyedropper | null>(null);

  if (viewportRef.current === null) {
    viewportRef.current = new CanvasViewport();
  }

  if (drawingRef.current === null) {
    drawingRef.current = new CanvasDrawing();
  }

  if (altAdjustRef.current === null) {
    altAdjustRef.current = new CanvasAltAdjust();
  }
  if (eyedropperRef.current === null) {
    eyedropperRef.current = new CanvasEyedropper();
  }

  const viewport = viewportRef.current;
  const drawing = drawingRef.current;
  const altAdjust = altAdjustRef.current;
  const eyedropper = eyedropperRef.current;

  const zoomLevel = useCanvasStore((s) => s.zoomLevel);
  const panOffset = useCanvasStore((s) => s.panOffset);
  const isAltPressed = useCanvasStore((s) => s.isAltPressed);
  const mousePos = useCanvasStore((s) => s.mousePos);

  const fitScale = Math.min(
    props.dimensions.width / CANVAS_SIZE,
    props.dimensions.height / CANVAS_SIZE,
  );
  const effectiveScale = fitScale * zoomLevel;
  const centerScale = props.centerOnInit ? effectiveScale : fitScale;
  const effectiveX =
    (props.dimensions.width - CANVAS_SIZE * centerScale) / 2 + panOffset.x;
  const effectiveY =
    (props.dimensions.height - CANVAS_SIZE * centerScale) / 2 + panOffset.y;

  const transform = {
    fitScale,
    effectiveScale,
    effectiveX,
    effectiveY,
    centerScale,
  };

  viewport.setContext(props, transform);
  drawing.setContext(props, transform);
  altAdjust.setContext(props, transform);
  eyedropper.setContext(props, transform);

  const getCanvasPos = (screenPos: Point): Point => ({
    x: (screenPos.x - effectiveX) / effectiveScale,
    y: (screenPos.y - effectiveY) / effectiveScale,
  });

  const prevAltRef = useRef(isAltPressed);
  useEffect(() => {
    if (!isAltPressed && prevAltRef.current) {
      altAdjustRef.current?.reset();
    }
    prevAltRef.current = isAltPressed;
  }, [isAltPressed]);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      const store = useCanvasStore.getState();
      if (store.isDrawing) {
        drawingRef.current?.saveStroke();
      }
      drawingRef.current?.reset();
      viewportRef.current?.reset();
    };
    globalThis.addEventListener("mouseup", handleGlobalMouseUp);
    return () => globalThis.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

  const handleWheelFn = (e: Konva.KonvaEventObject<WheelEvent>) =>
    viewport.wheel(e);

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.altKey) return;

    const stage = e.target.getStage();
    if (!stage) return;

    if (eyedropper.cancel(e)) return;
    if (viewport.startPan(e)) return;

    if (e.evt.button !== 0) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const canvasPos = getCanvasPos(pos);
    const margin = props.brushSize + 5;
    if (!isPointInCanvas(canvasPos, margin)) return;

    if (eyedropper.pick(canvasPos)) return;
    drawing.start(canvasPos);
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    const store = useCanvasStore.getState();

    if (viewport.movePan(e)) return;

    const canvasPos = getCanvasPos(pos);
    altAdjust.rememberPos(canvasPos);

    if (altAdjust.handle(e, pos, canvasPos)) return;

    if (!store.isDrawing) {
      store.setMousePos(canvasPos);
      return;
    }

    drawing.move(canvasPos);
  };

  const handleMouseUp = () => drawing.end();

  const handleMouseLeave = () => {
    const store = useCanvasStore.getState();
    if (store.isDrawing) {
      drawing.saveStroke();
    }
    drawing.reset();
    viewport.reset();
  };

  let cursorStroke = "black";
  if (mousePos) {
    const data = eyedropper.samplePixelData(mousePos);
    cursorStroke = data && data[3] > 0 ? "white" : "black";
  }

  let hoveredColor: string | null = null;
  if (mousePos && props.tool === "eyedropper" && isPointInCanvas(mousePos)) {
    hoveredColor = eyedropper.samplePixelHex(mousePos);
  }

  const isAdjusting = isAltPressed && altAdjust.isActive();

  const circleFill = isAdjusting
    ? hexToRGB(props.color, props.opacity)
    : "transparent";

  return {
    handleWheel: handleWheelFn,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    getCanvasPos,
    resetView: viewport.resetView,
    effectiveScale,
    effectiveX,
    effectiveY,
    cursorStroke,
    hoveredColor,
    isAdjusting,
    circleFill,
  };
}
