import type { Point } from "@/types/engine/canvas";

export const isPointInCanvas = (
  point: Point,
  dimensions: { width: number; height: number },
  margin = 0
): boolean => {
  return (
    point.x >= -margin &&
    point.x <= dimensions.width + margin &&
    point.y >= -margin &&
    point.y <= dimensions.height + margin
  );
};
