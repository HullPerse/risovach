import type { Point, PointerPair } from "@/types/engine/canvas";

export const pairCenter = ({ a, b }: PointerPair): Point => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

export const pairDistance = ({ a, b }: PointerPair): number => {
  return Math.hypot(a.x - b.x, a.y - b.y);
};

/**
 * The first two active pointers. A third finger does not affect the gesture,
 * or the distance would jump between different pairs.
 */
export const pointerPair = (
  pointers: ReadonlyMap<number, Point>
): PointerPair | null => {
  const values = [...pointers.values()];
  const [a, b] = values;

  return values.length >= 2 ? { a, b } : null;
};

/**
 * Two-pointer gesture: the distance ratio and where the centre moved. The
 * camera zooms around the old centre and then shifts by the centre delta, so
 * the document point stays under the fingers.
 */
export const pinchGesture = (
  from: PointerPair,
  to: PointerPair
): { anchor: Point; pan: Point; zoomFactor: number } => {
  const fromCenter = pairCenter(from);
  const toCenter = pairCenter(to);
  const fromDistance = pairDistance(from);
  const toDistance = pairDistance(to);

  return {
    anchor: fromCenter,
    pan: { x: toCenter.x - fromCenter.x, y: toCenter.y - fromCenter.y },
    zoomFactor: fromDistance > 0 ? toDistance / fromDistance : 1,
  };
};
