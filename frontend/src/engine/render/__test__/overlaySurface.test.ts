import { describe, expect, test } from "bun:test";

import { MAG_SIZE } from "@/config/drawing.config";
import {
  cursorRing,
  magnifierCrop,
  magnifierPosition,
} from "@/engine/render/overlaySurface.engine";
import type { Camera } from "@/types/engine/drawing";

const SIZE = { height: 512, width: 512 };
const VIEWPORT = { height: 512, width: 512 };
const CAMERA: Camera = { x: 0, y: 0, zoom: 1 };

describe("cursor ring", () => {
  test("inside the document the ring is half the brush in screen pixels", () => {
    expect(cursorRing(CAMERA, SIZE, VIEWPORT, 20, { x: 100, y: 100 })).toEqual({
      radius: 10,
      x: 100,
      y: 100,
    });
  });

  test("at a low zoom the ring is no smaller than the minimum", () => {
    const ring = cursorRing(
      { x: 0, y: 0, zoom: 0.1 },
      SIZE,
      VIEWPORT,
      8,
      { x: 100, y: 100 }
    );

    expect(ring?.radius).toBe(3);
  });

  test("outside the document there is no ring", () => {
    expect(cursorRing(CAMERA, SIZE, VIEWPORT, 20, { x: -5, y: 100 })).toBeNull();
    expect(
      cursorRing(CAMERA, SIZE, VIEWPORT, 20, { x: 100, y: 600 })
    ).toBeNull();
  });
});

describe("magnifier", () => {
  test("moves away from the pointer right and down", () => {
    expect(magnifierPosition({ x: 10, y: 10 }, VIEWPORT)).toEqual({
      x: 28,
      y: 28,
    });
  });

  test("does not leave the right and bottom edge", () => {
    expect(magnifierPosition({ x: 500, y: 500 }, VIEWPORT)).toEqual({
      x: VIEWPORT.width - MAG_SIZE,
      y: VIEWPORT.height - MAG_SIZE,
    });
  });

  test("near the left and top edge it clamps to zero", () => {
    expect(magnifierPosition({ x: -40, y: -40 }, VIEWPORT)).toEqual({
      x: 0,
      y: 0,
    });
  });

  test("the cut around the point uses source pixels", () => {
    expect(magnifierCrop(CAMERA, SIZE, VIEWPORT, { x: 100, y: 100 }, 2)).toEqual({
      size: 26,
      sx: 187,
      sy: 187,
    });
  });
});
