import { Stage, Layer, Line, Rect, Circle } from "react-konva";
import Konva from "konva";
import { useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/index.utils";
import {
  MIN_ZOOM,
  MAX_ZOOM,
  DEFAULT_INITIAL_ZOOM,
  DEFAULT_ZOOM_STEP,
  DEFAULT_LIMIT_TO_BOUNDS,
  DEFAULT_PANNING,
  DEFAULT_BRUSH_SIZE_RANGE,
  DEFAULT_BRUSH_OPACITY,
} from "@/config/canvas.config";
import type { CanvasProps, RequestImageOptions } from "@/types/canvas";
import { useCanvasStore } from "@/stores/canvas.store";

import CanvasMagnifier from "./components/magnifier.canvas";
import { useCanvasKeyboard } from "@/hooks/canvas/keyboard.hook";
import { useCanvasInteraction } from "@/hooks/canvas/interaction.hook";
import { useCanvasAPI } from "@/hooks/canvas/api.hook";

export function CanvasComponent({
  className,
  color,
  brushSize,
  tool,
  onMount,
  zoom,
  limitToBounds = DEFAULT_LIMIT_TO_BOUNDS,
  panning = DEFAULT_PANNING,
  centerOnInit = true,
  brushSizeRange = DEFAULT_BRUSH_SIZE_RANGE,
  opacity = DEFAULT_BRUSH_OPACITY,
  onBrushSizeChange,
  onOpacityChange,
  onColorPick,
  onToolChange,
  onToolCancel,
  dimensions,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const drawingLayerRef = useRef<Konva.Layer>(null);

  const initialZoom = zoom?.initialZoom ?? DEFAULT_INITIAL_ZOOM;
  const zoomStep = zoom?.step ?? DEFAULT_ZOOM_STEP;
  const zoomMin = zoom?.min ?? MIN_ZOOM;
  const zoomMax = zoom?.max ?? MAX_ZOOM;

  const initializedRef = useRef(false);
  if (!initializedRef.current) {
    initializedRef.current = true;
    const store = useCanvasStore.getState();
    store.setZoomLevel(Math.max(zoomMin, Math.min(zoomMax, initialZoom)));
    store.setPanOffset({ x: 0, y: 0 });
  }

  useCanvasKeyboard(onToolChange, onToolCancel, tool);

  const { lines, currentPoints, mousePos, isAltPressed } = useCanvasStore();

  const {
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    resetView,
    effectiveScale,
    effectiveX,
    effectiveY,
    cursorStroke,
    hoveredColor,
    circleFill,
  } = useCanvasInteraction({
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
    zoomConfig: { initialZoom, zoomStep, zoomMin, zoomMax },
    drawingLayerRef,
  });

  const requestImage = useCallback(
    async (options?: RequestImageOptions): Promise<File | null> => {
      const layer = drawingLayerRef.current;
      const stage = stageRef.current;
      if (!layer || !stage) return null;

      const prevScaleX = stage.scaleX();
      const prevScaleY = stage.scaleY();
      const prevX = stage.x();
      const prevY = stage.y();

      stage.scaleX(1);
      stage.scaleY(1);
      stage.x(0);
      stage.y(0);
      stage.draw();

      const canvas = layer.toCanvas({
        x: 0,
        y: 0,
        width: dimensions.width,
        height: dimensions.height,
        pixelRatio: 1,
      });

      stage.scaleX(prevScaleX);
      stage.scaleY(prevScaleY);
      stage.x(prevX);
      stage.y(prevY);
      stage.draw();

      const output = document.createElement("canvas");
      output.width = dimensions.width;
      output.height = dimensions.height;
      const ctx = output.getContext("2d");
      if (!ctx) return null;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);
      ctx.drawImage(canvas, 0, 0);

      const blob = await new Promise<Blob | null>((resolve) =>
        output.toBlob(resolve, "image/png"),
      );
      if (!blob) return null;

      const filename = options?.filename ?? `canvas-${Date.now()}.png`;
      return new File([blob], filename, { type: "image/png" });
    },
    [dimensions],
  );

  const canvasApi = useCanvasAPI(resetView, requestImage);

  useEffect(() => {
    onMount?.(canvasApi);
  }, [canvasApi, onMount]);

  return (
    <div
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
      className={cn("border-2 border-border overflow-hidden", className)}
      style={{ cursor: isAltPressed ? "crosshair" : "none" }}
    >
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        x={effectiveX}
        y={effectiveY}
        scaleX={effectiveScale}
        scaleY={effectiveScale}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className="overflow-hidden"
      >
        {/*layers.map(() => ())*/}
        {/*
          if !selectedLayer return
          else return allowActions
          */}
        <Layer listening={false}>
          <Rect
            x={0}
            y={0}
            width={dimensions.width}
            height={dimensions.height}
            fill="white"
            stroke="black"
            strokeWidth={0.1}
          />
        </Layer>

        <Layer
          ref={drawingLayerRef}
          clipX={0}
          clipY={0}
          clipWidth={dimensions.width}
          clipHeight={dimensions.height}
        >
          {lines.map((line, i) => (
            <Line
              key={i}
              points={line.points.flatMap((p) => [p.x, p.y])}
              stroke={line.tool === "eraser" ? "white" : line.color}
              strokeWidth={line.brushSize}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
              perfectDrawEnabled={false}
              listening={false}
              opacity={line.tool === "eraser" ? 1 : line.opacity}
              globalCompositeOperation={
                line.tool === "eraser" ? "destination-out" : "source-over"
              }
            />
          ))}

          {currentPoints.length > 1 && (
            <Line
              points={currentPoints.flatMap((p) => [p.x, p.y])}
              stroke={tool === "eraser" ? "white" : color}
              strokeWidth={brushSize}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
              opacity={tool === "eraser" ? 1 : opacity}
              globalCompositeOperation={
                tool === "eraser" ? "destination-out" : "source-over"
              }
            />
          )}
        </Layer>

        <Layer imageSmoothingEnabled={false}>
          <CanvasMagnifier
            tool={tool}
            mousePos={mousePos}
            hoveredColor={hoveredColor}
            drawingLayerRef={drawingLayerRef}
            effectiveScale={effectiveScale}
            effectiveDimensions={{
              x: effectiveX,
              y: effectiveY,
            }}
          />

          {mousePos && (
            <Circle
              x={mousePos.x}
              y={mousePos.y}
              stroke={cursorStroke}
              strokeWidth={1}
              radius={brushSize / 2}
              fill={isAltPressed ? circleFill : "transparent"}
              listening={false}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
}
