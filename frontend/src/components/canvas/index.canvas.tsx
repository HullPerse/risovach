import type Konva from "konva";
import type { Ref } from "react";
import { useRef, useLayoutEffect, useState, useImperativeHandle } from "react";
import { Stage, Layer, Line, Rect, Circle } from "react-konva";

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
import { useCanvasAPI } from "@/hooks/canvas/api.hook";
import { useCanvasInteraction } from "@/hooks/canvas/interaction.hook";
import { useCanvasKeyboard } from "@/hooks/canvas/keyboard.hook";
import { requestImage } from "@/lib/canvas.utils";
import { cn } from "@/lib/index.utils";
import { useCanvasStore } from "@/stores/canvas.store";
import type {
  CanvasAPI,
  CanvasProps,
  CanvasTool,
  DrawingLine,
} from "@/types/canvas";

import CanvasMagnifier from "./components/magnifier.canvas";

const StrokeLine = ({ line }: { line: DrawingLine }) => {
  const isEraser = line.tool === "eraser";
  return (
    <Line
      points={line.points.flatMap((p) => [p.x, p.y])}
      stroke={isEraser ? "white" : line.color}
      strokeWidth={line.brushSize}
      tension={0.5}
      lineCap="round"
      lineJoin="round"
      perfectDrawEnabled={false}
      listening={false}
      opacity={isEraser ? 1 : line.opacity}
      globalCompositeOperation={isEraser ? "destination-out" : "source-over"}
    />
  );
};

const CurrentStroke = ({
  points,
  tool,
  color,
  brushSize,
  opacity,
}: {
  points: number[];
  tool: CanvasTool;
  color: string;
  brushSize: number;
  opacity: number;
}) => {
  const isEraser = tool === "eraser";
  return (
    <Line
      points={points}
      stroke={isEraser ? "white" : color}
      strokeWidth={brushSize}
      tension={0.5}
      lineCap="round"
      lineJoin="round"
      opacity={isEraser ? 1 : opacity}
      globalCompositeOperation={isEraser ? "destination-out" : "source-over"}
    />
  );
};

export const CanvasComponent = ({
  className,
  color,
  brushSize,
  tool,
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
  ref,
}: CanvasProps & { ref?: Ref<CanvasAPI | null> }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const drawingLayerRef = useRef<Konva.Layer>(null);
  const [drawingCanvas, setDrawingCanvas] = useState<HTMLCanvasElement | null>(
    null
  );

  const initialZoom = zoom?.initialZoom ?? DEFAULT_INITIAL_ZOOM;
  const zoomStep = zoom?.step ?? DEFAULT_ZOOM_STEP;
  const zoomMin = zoom?.min ?? MIN_ZOOM;
  const zoomMax = zoom?.max ?? MAX_ZOOM;

  useLayoutEffect(() => {
    const store = useCanvasStore.getState();
    store.setZoomLevel(Math.max(zoomMin, Math.min(zoomMax, initialZoom)));
    store.setPanOffset({ x: 0, y: 0 });
  }, [initialZoom, zoomMax, zoomMin]);

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
    brushSize,
    brushSizeRange,
    centerOnInit,
    color,
    dimensions,
    drawingLayerRef,
    limitToBounds,
    onBrushSizeChange,
    onColorPick,
    onOpacityChange,
    onToolCancel,
    onToolChange,
    opacity,
    panning,
    tool,
    zoomConfig: { initialZoom, zoomMax, zoomMin, zoomStep },
  });

  const canvasApi = useCanvasAPI(resetView, (options) =>
    requestImage(stageRef, drawingLayerRef, dimensions, {
      filename: "canvas.png",
      ...options,
    })
  );

  useImperativeHandle(ref, () => canvasApi);

  return (
    <div
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
      className={cn("border-border overflow-hidden border-2", className)}
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
          ref={(node) => {
            drawingLayerRef.current = node;
            setDrawingCanvas(node?.getCanvas()._canvas ?? null);
          }}
          clipX={0}
          clipY={0}
          clipWidth={dimensions.width}
          clipHeight={dimensions.height}
        >
          {lines.map((line) => (
            <StrokeLine key={line.id} line={line} />
          ))}

          {currentPoints.length > 1 && (
            <CurrentStroke
              points={currentPoints.flatMap((p) => [p.x, p.y])}
              tool={tool}
              color={color}
              brushSize={brushSize}
              opacity={opacity}
            />
          )}
        </Layer>

        <Layer imageSmoothingEnabled={false}>
          <CanvasMagnifier
            tool={tool}
            mousePos={mousePos}
            hoveredColor={hoveredColor}
            drawingCanvas={drawingCanvas}
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
};
