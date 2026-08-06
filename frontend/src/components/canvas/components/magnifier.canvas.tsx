import { MAG_CELL, MAG_SIZE, MAG_SOURCE } from "@/config/canvas.config";
import type { CanvasTool, Point } from "@/types/canvas";
import type { Layer } from "konva/lib/Layer";
import type { RefObject } from "react";
import { Line, Rect, Group, Image } from "react-konva";

function CanvasMagnifier({
  tool,
  mousePos,
  hoveredColor,
  drawingLayerRef,
  effectiveScale,
  effectiveDimensions,
}: {
  tool: CanvasTool;
  mousePos: Point | null;
  hoveredColor: string | null;
  drawingLayerRef: RefObject<Layer | null>;
  effectiveScale: number;
  effectiveDimensions: {
    x: number;
    y: number;
  };
}) {
  const magnifier = (() => {
    if (tool !== "eyedropper" || !mousePos || !hoveredColor) return null;
    const layer = drawingLayerRef.current;
    const imageEl = layer?.getCanvas()._canvas;
    if (!imageEl) return null;

    const sx = mousePos.x * effectiveScale + effectiveDimensions.x;
    const sy = mousePos.y * effectiveScale + effectiveDimensions.y;

    const grid: number[] = [];
    for (let i = 1; i < MAG_SOURCE; i++) {
      const p = i * MAG_CELL;
      grid.push(p, 0, p, MAG_SIZE);
      grid.push(0, p, MAG_SIZE, p);
    }

    return {
      imageEl,
      x: (sx - effectiveDimensions.x) / effectiveScale,
      y: (sy - effectiveDimensions.y) / effectiveScale,
      crop: {
        x: Math.round(sx) - Math.floor(MAG_SOURCE / 2),
        y: Math.round(sy) - Math.floor(MAG_SOURCE / 2),
        width: MAG_SOURCE,
        height: MAG_SOURCE,
      },
      hex: hoveredColor,
      grid,
    };
  })();

  if (!magnifier) return;

  return (
    <Group
      x={magnifier.x}
      y={magnifier.y}
      scaleX={1 / effectiveScale}
      scaleY={1 / effectiveScale}
    >
      <Rect
        x={4}
        y={4}
        width={MAG_SIZE}
        height={MAG_SIZE}
        fill="rgba(0,0,0,0.85)"
        listening={false}
      />
      <Rect width={MAG_SIZE} height={MAG_SIZE} fill="white" listening={false} />
      <Image
        image={magnifier.imageEl}
        crop={magnifier.crop}
        width={MAG_SIZE}
        height={MAG_SIZE}
        listening={false}
      />
      <Line
        points={magnifier.grid}
        stroke="rgba(0,0,0,0.15)"
        strokeWidth={1}
        listening={false}
      />
      <Rect
        width={MAG_SIZE}
        height={MAG_SIZE}
        fill="transparent"
        stroke="black"
        strokeWidth={3}
        listening={false}
      />
      <Rect
        x={1}
        y={1}
        width={MAG_SIZE - 2}
        height={MAG_SIZE - 2}
        fill="transparent"
        stroke="white"
        strokeWidth={1}
        listening={false}
      />
      <Rect
        x={-MAG_CELL / 2}
        y={-MAG_CELL / 2}
        width={MAG_CELL}
        height={MAG_CELL}
        fill={magnifier.hex}
        stroke="white"
        strokeWidth={1.5}
        listening={false}
      />
      <Rect
        x={-MAG_CELL / 2}
        y={-MAG_CELL / 2}
        width={MAG_CELL}
        height={MAG_CELL}
        fill="transparent"
        stroke="black"
        strokeWidth={1}
        listening={false}
      />
    </Group>
  );
}

export default CanvasMagnifier;
