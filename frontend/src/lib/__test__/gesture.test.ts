import { describe, expect, test } from "bun:test";

import {
  pairCenter,
  pairDistance,
  pinchGesture,
  pointerPair,
} from "@/lib/gesture.utils";

describe("two pointer gesture", () => {
  test("the centre and distance use the two points", () => {
    const pair = { a: { x: 0, y: 0 }, b: { x: 100, y: 40 } };

    expect(pairCenter(pair)).toEqual({ x: 50, y: 20 });
    expect(pairDistance(pair)).toBeCloseTo(107.70329614, 5);
  });

  test("spreading fingers raises zoom and shifts the centre", () => {
    const gesture = pinchGesture(
      { a: { x: 0, y: 0 }, b: { x: 100, y: 0 } },
      { a: { x: 0, y: 0 }, b: { x: 200, y: 0 } }
    );

    expect(gesture.zoomFactor).toBe(2);
    expect(gesture.anchor).toEqual({ x: 50, y: 0 });
    expect(gesture.pan).toEqual({ x: 50, y: 0 });
  });

  test("pinching fingers lowers zoom", () => {
    const gesture = pinchGesture(
      { a: { x: 0, y: 0 }, b: { x: 200, y: 0 } },
      { a: { x: 0, y: 0 }, b: { x: 100, y: 0 } }
    );

    expect(gesture.zoomFactor).toBe(0.5);
    expect(gesture.pan).toEqual({ x: -50, y: 0 });
  });

  test("the pair comes from the first two pointers", () => {
    const pointers = new Map([
      [1, { x: 0, y: 0 }],
      [2, { x: 10, y: 0 }],
      [3, { x: 50, y: 50 }],
    ]);

    expect(pointerPair(pointers)).toEqual({
      a: { x: 0, y: 0 },
      b: { x: 10, y: 0 },
    });
    expect(pointerPair(new Map([[1, { x: 0, y: 0 }]]))).toBeNull();
    expect(pointerPair(new Map())).toBeNull();
  });

  test("coincident points give no division by zero", () => {
    const gesture = pinchGesture(
      { a: { x: 10, y: 10 }, b: { x: 10, y: 10 } },
      { a: { x: 30, y: 10 }, b: { x: 30, y: 10 } }
    );

    expect(gesture.zoomFactor).toBe(1);
    expect(gesture.pan).toEqual({ x: 20, y: 0 });
  });
});
