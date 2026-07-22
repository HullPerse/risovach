import { Stage, Layer, Line, Rect, Circle } from "react-konva";
import Konva from "konva";
import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { CANVAS_SIZE } from "@/lib/canvas.utils";
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
import type { CanvasProps } from "@/types/canvas";
import { useCanvasStore } from "@/stores/canvas.store";
import {
  useCanvasKeyboard,
  useCanvasAPI,
  useCanvasInteraction,
} from "@/hooks/canvas.hook";

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

  useCanvasKeyboard();

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
    limitToBounds,
    panning,
    centerOnInit,
    zoomConfig: { initialZoom, zoomStep, zoomMin, zoomMax },
    drawingLayerRef,
  });

  const api = useCanvasAPI(resetView);

  useEffect(() => {
    onMount?.(api);
  }, [api, onMount]);

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
        <Layer listening={false}>
          <Rect
            x={0}
            y={0}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            fill="white"
            stroke="black"
            strokeWidth={0.1}
          />
        </Layer>

        <Layer
          ref={drawingLayerRef}
          clipX={0}
          clipY={0}
          clipWidth={CANVAS_SIZE}
          clipHeight={CANVAS_SIZE}
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

        <Layer>
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
