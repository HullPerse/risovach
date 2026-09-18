import { describe, expect, test } from "bun:test";

import {
  CURSOR_GAP,
  MAG_CELL,
  MAG_CELL_MIN,
  MAG_EYE_HEIGHT,
  MAG_LABEL_GAP,
  MAG_LABEL_HEIGHT,
  MAG_RETICLE_ARM,
  MAG_SIZE,
  MAG_SOURCE,
  OVERLAY_SHADOW,
  PADDING,
} from "@/config/drawing.config";
import { minimapLayout } from "@/lib/minimap.utils";
import {
  cursorRing,
  eyeCurve,
  magnifierBox,
  magnifierCrop,
  magnifierExtent,
  magnifierPosition,
  pixelReticle,
} from "@/engine/render/overlaySurface.engine";

import {
  drawnPixelRect,
  tileScreenBox,
} from "@/engine/render/tileSurface.engine";
import type { Camera, Rect } from "@/types/engine/drawing";

/** Same rule the overlay uses to tell overlapping boxes apart. */
const intersection = (from: Rect, to: Rect): Rect | null => {
  const x = Math.max(from.x, to.x);
  const y = Math.max(from.y, to.y);
  const right = Math.min(from.x + from.width, to.x + to.width);
  const bottom = Math.min(from.y + from.height, to.y + to.height);

  if (right <= x || bottom <= y) return null;

  return { height: bottom - y, width: right - x, x, y };
};

const SIZE = { height: 512, width: 512 };
const VIEWPORT = { height: 512, width: 512 };
const CAMERA: Camera = { x: 0, y: 0, zoom: 1 };
const TILE = 256;

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
      x: 10 + CURSOR_GAP,
      y: 10 + CURSOR_GAP,
    });
  });

  test("flips to the other side when it does not fit there", () => {
    const extent = magnifierExtent();
    const position = magnifierPosition({ x: 500, y: 500 }, VIEWPORT);

    // Not clamped to the edge: clamped it would sit under the pointer and hide
    // the reticle and the loupe's own subject.
    expect(position.x + extent.width).toBeLessThan(500);
    expect(position.y + extent.height).toBeLessThan(500);
    expect(position).toEqual({
      x: 500 - CURSOR_GAP - extent.width,
      y: 500 - CURSOR_GAP - extent.height,
    });
  });

  test("in a viewport smaller than the loupe it clamps to zero", () => {
    expect(
      magnifierPosition({ x: 50, y: 50 }, { height: 100, width: 100 })
    ).toEqual({ x: 0, y: 0 });
  });

  test("the eye corners sit at mid height and peak at box edges", () => {
    const curve = eyeCurve({ x: 10, y: 20 });
    const midY = 20 + MAG_EYE_HEIGHT / 2;

    expect(curve.left).toEqual({ x: 10, y: midY });
    expect(curve.right).toEqual({ x: 10 + MAG_SIZE, y: midY });
    expect(curve.topControl.x).toBe(10 + MAG_SIZE / 2);
    expect(curve.bottomControl.x).toBe(10 + MAG_SIZE / 2);

    const topPeak =
      (curve.left.y + 2 * curve.topControl.y + curve.right.y) / 4;
    const bottomPeak =
      (curve.left.y + 2 * curve.bottomControl.y + curve.right.y) / 4;

    expect(topPeak).toBe(20);
    expect(bottomPeak).toBe(20 + MAG_EYE_HEIGHT);
  });

  test("the dirty box covers the eye, its shadow and the hex plate", () => {
    const pad = PADDING + 4;

    expect(magnifierBox({ x: 10, y: 20 })).toEqual({
      height:
        MAG_EYE_HEIGHT +
        OVERLAY_SHADOW +
        MAG_LABEL_GAP +
        MAG_LABEL_HEIGHT +
        pad * 2,
      width: MAG_SIZE + OVERLAY_SHADOW + pad * 2,
      x: 10 - pad,
      y: 20 - pad,
    });
  });

  test("the minimap panel pushes the loupe to the other side", () => {
    const layout = minimapLayout(SIZE, VIEWPORT);
    const point = { x: 348, y: 40 };
    const plain = magnifierPosition(point, VIEWPORT);
    const avoided = magnifierPosition(point, VIEWPORT, layout.panel);

    // Without the panel the loupe sits right and below, over the panel that is
    // drawn on top of the overlay.
    expect(intersection(magnifierBox(plain), layout.panel)).not.toBeNull();
    expect(intersection(magnifierBox(avoided), layout.panel)).toBeNull();
    expect(avoided.x).toBeLessThan(plain.x);
  });

  test("near the left and top edge it clamps to zero", () => {
    expect(magnifierPosition({ x: -40, y: -40 }, VIEWPORT)).toEqual({
      x: 0,
      y: 0,
    });
  });

  test("the cut around a sampled pixel is a whole number of pixels", () => {
    expect(
      magnifierCrop({ height: 1, width: 1, x: 100, y: 100 }, 2)
    ).toEqual({ size: 26, sx: 188, sy: 188 });
  });

  test("the sampled pixel covers the middle cell at any camera", () => {
    const middle = MAG_SIZE / 2 - MAG_CELL / 2;
    const cameras: Camera[] = [
      CAMERA,
      { x: 7.3, y: -4.9, zoom: 1.386 },
      { x: -120.5, y: 33.25, zoom: 0.42 },
    ];
    const pixel = { x: 100, y: 37 };

    for (const camera of cameras) {
      for (const dpr of [1, 2]) {
        const cell = drawnPixelRect(camera, VIEWPORT, SIZE, pixel, TILE, dpr);
        const crop = magnifierCrop(cell, dpr);
        const start = ((cell.x * dpr - crop.sx) / crop.size) * MAG_SIZE;
        const end =
          ((cell.x * dpr + cell.width * dpr - crop.sx) / crop.size) * MAG_SIZE;

        // The window is centred on the pixel, not on the pointer: an odd
        // source count with a pointer-centred window puts the pixel on a cell
        // boundary, and the loupe then shows a neighbour of the picked colour.
        expect(start).toBeCloseTo(middle, 6);
        expect(end).toBeCloseTo(middle + MAG_CELL, 6);
        expect(crop.size / (cell.width * dpr)).toBeCloseTo(MAG_SOURCE, 6);
      }
    }
  });
});

describe("eyedropper reticle", () => {
  const PIXEL = { x: 10, y: 20 };

  test("the cell grows to the minimum around the drawn pixel centre", () => {
    const drawn = drawnPixelRect(CAMERA, VIEWPORT, SIZE, PIXEL, TILE, 1);
    const reticle = pixelReticle(drawn);

    expect(drawn.width).toBe(1);
    expect(reticle.cell.width).toBe(MAG_CELL_MIN);
    expect(reticle.cell.height).toBe(MAG_CELL_MIN);
    expect(reticle.cell.x + reticle.cell.width / 2).toBeCloseTo(
      drawn.x + drawn.width / 2,
      6
    );
    expect(reticle.cell.y + reticle.cell.height / 2).toBeCloseTo(
      drawn.y + drawn.height / 2,
      6
    );
  });

  test("at a zoom above the minimum the cell is the drawn pixel", () => {
    const document = { height: 64, width: 64 };
    const camera: Camera = { x: 0, y: 0, zoom: 10 };
    const box = tileScreenBox(0, camera, VIEWPORT, document, 64, 1);
    const reticle = pixelReticle(
      drawnPixelRect(camera, VIEWPORT, document, { x: 8, y: 8 }, 64, 1)
    );

    expect(reticle.cell).toEqual({
      height: 10,
      width: 10,
      x: box.x + 80,
      y: box.y + 80,
    });
  });

  test("the marks are eight arms pointing inwards from the corners", () => {
    const reticle = pixelReticle(
      drawnPixelRect(CAMERA, VIEWPORT, SIZE, PIXEL, TILE, 1)
    );
    const right = reticle.cell.x + reticle.cell.width;
    const bottom = reticle.cell.y + reticle.cell.height;
    const { x, y } = reticle.cell;

    expect(reticle.segments).toHaveLength(8);
    expect(reticle.segments).toContainEqual({
      x1: x,
      x2: x + MAG_RETICLE_ARM,
      y1: y,
      y2: y,
    });
    expect(reticle.segments).toContainEqual({
      x1: right,
      x2: right,
      y1: bottom,
      y2: bottom - MAG_RETICLE_ARM,
    });
  });
});
