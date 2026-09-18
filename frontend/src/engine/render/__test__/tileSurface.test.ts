import { describe, expect, test } from "bun:test";

import {
  documentScreenRect,
  drawnPixelRect,
  tileScreenBox,
} from "@/engine/render/tileSurface.engine";
import type { Camera } from "@/types/engine/drawing";

const SIZE = { height: 512, width: 512 };
const VIEWPORT = { height: 512, width: 512 };
const CAMERA: Camera = { x: 0, y: 0, zoom: 1 };

/** Distance from the value to the device pixel grid. */
const gridError = (value: number, dpr: number): number =>
  Math.abs(value * dpr - Math.round(value * dpr));

describe("document rectangle on screen", () => {
  test("at an equal size the document fills the viewport", () => {
    expect(
      documentScreenRect({ camera: CAMERA, document: SIZE, viewport: VIEWPORT })
    ).toEqual({ height: 512, width: 512, x: 0, y: 0 });
  });

  test("zoom grows the rectangle around the centre", () => {
    expect(
      documentScreenRect({
        camera: { x: 0, y: 0, zoom: 2 },
        document: SIZE,
        viewport: VIEWPORT,
      })
    ).toEqual({ height: 1024, width: 1024, x: -256, y: -256 });
  });
});

/**
 * The avatar document from the report: two tiles per side, so exactly one
 * boundary in each direction. At a fractional zoom it used to show up as a
 * light line of the sheet between the tiles.
 */
describe("tile rectangle on screen", () => {
  const DOCUMENT = { height: 420, width: 420 };
  const TILE = 256;
  const ZOOMED: Camera = { x: -17.3, y: 3.2, zoom: 1.386 };

  test("neighbouring tiles meet on one device pixel, not on a gap", () => {
    for (const dpr of [1, 2]) {
      const left = tileScreenBox(0, ZOOMED, VIEWPORT, DOCUMENT, TILE, dpr);
      const right = tileScreenBox(1, ZOOMED, VIEWPORT, DOCUMENT, TILE, dpr);

      expect(left.x + left.width).toBeCloseTo(right.x, 6);
      expect(gridError(left.x, dpr)).toBeCloseTo(0, 6);
      expect(gridError(left.x + left.width, dpr)).toBeCloseTo(0, 6);
      expect(gridError(right.x + right.width, dpr)).toBeCloseTo(0, 6);
    }
  });

  test("the same holds along the horizontal boundary", () => {
    const top = tileScreenBox(0, ZOOMED, VIEWPORT, DOCUMENT, TILE, 1);
    const bottom = tileScreenBox(2, ZOOMED, VIEWPORT, DOCUMENT, TILE, 1);

    expect(top.y + top.height).toBeCloseTo(bottom.y, 6);
  });

  test("both tiles still cover their whole span after snapping", () => {
    const dpr = 1;
    const first = tileScreenBox(0, ZOOMED, VIEWPORT, DOCUMENT, TILE, dpr);
    const second = tileScreenBox(1, ZOOMED, VIEWPORT, DOCUMENT, TILE, dpr);
    const covered = first.width + second.width;

    expect(Math.abs(covered - TILE * 2 * ZOOMED.zoom)).toBeLessThanOrEqual(
      1 / dpr
    );
  });
});

/**
 * The eyedropper reticle and its loupe need the pixel as it is really drawn:
 * the tile is snapped as a whole, so pixels inside it keep the tile's scale.
 */
describe("drawn document pixel", () => {
  const DOCUMENT = { height: 420, width: 420 };
  const TILE = 256;
  const ZOOMED: Camera = { x: -17.3, y: 3.2, zoom: 1.386 };

  test("the pixel keeps the tile scale, not its own rounding", () => {
    const dpr = 1;
    const box = tileScreenBox(0, ZOOMED, VIEWPORT, DOCUMENT, TILE, dpr);
    const scale = box.width / TILE;
    const cell = drawnPixelRect(
      ZOOMED,
      VIEWPORT,
      DOCUMENT,
      { x: 200, y: 10 },
      TILE,
      dpr
    );

    expect(scale).not.toBeCloseTo(ZOOMED.zoom, 3);
    expect(cell.width).toBeCloseTo(scale, 6);
    expect(cell.x).toBeCloseTo(box.x + 200 * scale, 6);
  });

  test("neighbouring pixels share an edge", () => {
    const left = drawnPixelRect(
      ZOOMED,
      VIEWPORT,
      DOCUMENT,
      { x: 200, y: 10 },
      TILE,
      1
    );
    const right = drawnPixelRect(
      ZOOMED,
      VIEWPORT,
      DOCUMENT,
      { x: 201, y: 10 },
      TILE,
      1
    );

    expect(left.x + left.width).toBeCloseTo(right.x, 6);
  });
});
