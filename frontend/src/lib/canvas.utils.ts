import type { Point } from "@/types/canvas";

export function isPointInCanvas(
  point: Point,
  dimensions: { width: number; height: number },
  margin: number = 0,
): boolean {
  return (
    point.x >= -margin &&
    point.x <= dimensions.width + margin &&
    point.y >= -margin &&
    point.y <= dimensions.height + margin
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
    -(dimensions.width - dimensions.width * centerScale) / 2 -
    dimensions.width * effectiveScale;
  const maxX =
    dimensions.width - (dimensions.width - dimensions.width * centerScale) / 2;
  const minY =
    -(dimensions.height - dimensions.height * centerScale) / 2 -
    dimensions.height * effectiveScale;
  const maxY =
    dimensions.height - (dimensions.height - dimensions.height * centerScale) / 2;
  return {
    x: Math.max(minX, Math.min(maxX, offset.x)),
    y: Math.max(minY, Math.min(maxY, offset.y)),
  };
}

export function clipPointsToCanvas(
  points: Point[],
  dimensions: { width: number; height: number },
): Point[] {
  if (points.length === 0) return points;
  const margin = 0;
  return points.map((p) => ({
    x: Math.max(-margin, Math.min(dimensions.width + margin, p.x)),
    y: Math.max(-margin, Math.min(dimensions.height + margin, p.y)),
  }));
}

export function hexToRGB(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
}

export function hexFromPixelComposite(pixel: Uint8ClampedArray): string {
  const [r, g, b, a] = pixel;
  const alpha = a / 255;
  const inv = 1 - alpha;
  const fr = Math.round(r * alpha + 255 * inv);
  const fg = Math.round(g * alpha + 255 * inv);
  const fb = Math.round(b * alpha + 255 * inv);

  return (
    "#" +
    [fr, fg, fb]
      .map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0"))
      .join("")
  );
}
