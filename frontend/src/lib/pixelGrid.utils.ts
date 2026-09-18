import type { Rect } from "@/types/engine/drawing";

/** Device pixel grid: a fractional zoom must not leave a sliver. */
export const snapToPixel = (value: number, dpr: number): number =>
  Math.round(value * dpr) / dpr;

/**
 * The same rectangle with its edges on the device grid. Edges are snapped,
 * the size follows them: at a fractional zoom two independently rounded
 * rectangles shared one boundary and left a sliver between them.
 */
export const deviceRect = (rect: Rect, dpr: number): Rect => {
  const left = snapToPixel(rect.x, dpr);
  const top = snapToPixel(rect.y, dpr);
  const right = snapToPixel(rect.x + rect.width, dpr);
  const bottom = snapToPixel(rect.y + rect.height, dpr);

  return {
    height: Math.max(0, bottom - top),
    width: Math.max(0, right - left),
    x: left,
    y: top,
  };
};

/**
 * Sides of a frame one device pixel thick inside the rectangle. Each side is
 * centred on its own row or column of the device grid, so a 1/dpr stroke
 * drawn on the path covers exactly that row and stays inside the sheet.
 */
export const frameEdges = (
  rect: Rect,
  dpr: number
): { bottom: number; left: number; right: number; top: number } => {
  const unit = 1 / dpr;

  return {
    bottom: snapToPixel(rect.y + rect.height, dpr) - unit / 2,
    left: snapToPixel(rect.x, dpr) + unit / 2,
    right: snapToPixel(rect.x + rect.width, dpr) - unit / 2,
    top: snapToPixel(rect.y, dpr) + unit / 2,
  };
};
