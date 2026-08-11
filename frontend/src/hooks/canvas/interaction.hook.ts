import type Konva from "konva";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { CanvasAltAdjust } from "@/api/canvas/alt.api";
import { CanvasDrawing } from "@/api/canvas/drawing.api";
import { CanvasEyedropper } from "@/api/canvas/dropper.api";
import { CanvasViewport } from "@/api/canvas/viewport.api";
import { hexToRGB, isPointInCanvas } from "@/lib/canvas.utils";
import { useCanvasStore } from "@/stores/canvas.store";
import type { CanvasInteractionProps, Point } from "@/types/canvas";

export const useCanvasInteraction = (props: CanvasInteractionProps) => {
  const viewport = useMemo(() => new CanvasViewport(), []);
  const drawing = useMemo(() => new CanvasDrawing(), []);
  const altAdjust = useMemo(() => new CanvasAltAdjust(), []);
  const eyedropper = useMemo(() => new CanvasEyedropper(), []);

  const zoomLevel = useCanvasStore((s) => s.zoomLevel);
  const panOffset = useCanvasStore((s) => s.panOffset);
  const isAltPressed = useCanvasStore((s) => s.isAltPressed);
  const mousePos = useCanvasStore((s) => s.mousePos);

  const effectiveScale = zoomLevel;
  const centerScale = props.centerOnInit ? effectiveScale : 1;
  const effectiveX =
    (props.dimensions.width - props.dimensions.width * centerScale) / 2 +
    panOffset.x;
  const effectiveY =
    (props.dimensions.height - props.dimensions.height * centerScale) / 2 +
    panOffset.y;

  const transform = {
    centerScale,
    effectiveScale,
    effectiveX,
    effectiveY,
  };

  useEffect(() => {
    viewport.setContext(props, transform);
    drawing.setContext(props);
    altAdjust.setContext(props);
    eyedropper.setContext(props, transform);
  });

  const getCanvasPos = (screenPos: Point): Point => ({
    x: (screenPos.x - effectiveX) / effectiveScale,
    y: (screenPos.y - effectiveY) / effectiveScale,
  });

  const prevAltRef = useRef(isAltPressed);
  useEffect(() => {
    if (!isAltPressed && prevAltRef.current) {
      altAdjust.reset();
    }
    prevAltRef.current = isAltPressed;
  }, [altAdjust, isAltPressed]);

  const pendingMousePosRef = useRef<Point | null>(null);
  const mouseRafRef = useRef(0);
  useEffect(
    () => () => {
      cancelAnimationFrame(mouseRafRef.current);
    },
    []
  );

  const endStroke = useCallback(() => {
    const store = useCanvasStore.getState();
    if (store.isDrawing) {
      drawing.saveStroke();
    }
    drawing.reset();
    viewport.reset();
  }, [drawing, viewport]);

  useEffect(() => {
    globalThis.addEventListener("mouseup", endStroke);
    return () => globalThis.removeEventListener("mouseup", endStroke);
  }, [endStroke]);

  const handleWheelFn = (e: Konva.KonvaEventObject<WheelEvent>) =>
    viewport.wheel(e);

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.altKey) {
      return;
    }

    const stage = e.target.getStage();
    if (!stage) {
      return;
    }

    if (eyedropper.cancel(e)) {
      return;
    }
    if (viewport.startPan(e)) {
      return;
    }

    if (e.evt.button !== 0) {
      return;
    }
    const pos = stage.getPointerPosition();
    if (!pos) {
      return;
    }
    const canvasPos = getCanvasPos(pos);
    const margin = props.brushSize + 5;
    if (!isPointInCanvas(canvasPos, props.dimensions, margin)) {
      return;
    }

    if (eyedropper.pick(canvasPos)) {
      return;
    }
    drawing.start(canvasPos);
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) {
      return;
    }
    const pos = stage.getPointerPosition();
    if (!pos) {
      return;
    }

    const store = useCanvasStore.getState();

    if (viewport.movePan(e)) {
      return;
    }

    const canvasPos = getCanvasPos(pos);
    altAdjust.rememberPos(canvasPos);

    if (altAdjust.handle(e, pos, canvasPos)) {
      return;
    }

    if (!store.isDrawing) {
      pendingMousePosRef.current = canvasPos;

      if (!mouseRafRef.current) {
        mouseRafRef.current = requestAnimationFrame(() => {
          mouseRafRef.current = 0;

          const pending = pendingMousePosRef.current;
          pendingMousePosRef.current = null;

          if (pending) useCanvasStore.getState().setMousePos(pending);
        });
      }
      return;
    }

    drawing.move(canvasPos);
  };

  const handleMouseUp = () => drawing.end();

  let cursorStroke = "black";
  if (mousePos && props.tool === "eyedropper") {
    const data = eyedropper.samplePixelData(mousePos);
    cursorStroke = data && data[3] > 0 ? "white" : "black";
  }

  let hoveredColor: string | null = null;
  if (
    mousePos &&
    props.tool === "eyedropper" &&
    isPointInCanvas(mousePos, props.dimensions)
  ) {
    hoveredColor = eyedropper.samplePixelHex(mousePos);
  }

  const isAdjusting = isAltPressed && altAdjust.isActive();

  const circleFill = isAdjusting
    ? hexToRGB(props.color, props.opacity)
    : "transparent";

  return {
    circleFill,
    cursorStroke,
    effectiveScale,
    effectiveX,
    effectiveY,
    getCanvasPos,
    handleMouseDown,
    handleMouseLeave: endStroke,
    handleMouseMove,
    handleMouseUp,
    handleWheel: handleWheelFn,
    hoveredColor,
    isAdjusting,
    resetView: viewport.resetView,
  };
};
