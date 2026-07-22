import type { Point } from "@/types/canvas";

export const CANVAS_SIZE = 640;

export function isPointInCanvas(point: Point, margin: number = 0): boolean {
  return (
    point.x >= -margin &&
    point.x <= CANVAS_SIZE + margin &&
    point.y >= -margin &&
    point.y <= CANVAS_SIZE + margin
  );
}

export function clampOffset(
  offset: Point,
  dimensions: { width: number; height: number },
  centerScale: number,
  effectiveScale: number,
  limitToBounds: boolean,
): Point {
  if (!limitToBounds) return offset;
  const minX =
    -(dimensions.width - CANVAS_SIZE * centerScale) / 2 -
    CANVAS_SIZE * effectiveScale;
  const maxX =
    dimensions.width - (dimensions.width - CANVAS_SIZE * centerScale) / 2;
  const minY =
    -(dimensions.height - CANVAS_SIZE * centerScale) / 2 -
    CANVAS_SIZE * effectiveScale;
  const maxY =
    dimensions.height - (dimensions.height - CANVAS_SIZE * centerScale) / 2;
  return {
    x: Math.max(minX, Math.min(maxX, offset.x)),
    y: Math.max(minY, Math.min(maxY, offset.y)),
  };
}

export function clipPointsToCanvas(points: Point[]): Point[] {
  if (points.length === 0) return points;
  const margin = 0;
  return points.map((p) => ({
    x: Math.max(-margin, Math.min(CANVAS_SIZE + margin, p.x)),
    y: Math.max(-margin, Math.min(CANVAS_SIZE + margin, p.y)),
  }));
}

export function hexToRGB(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
}
