import { describe, expect, test } from "bun:test";

import {
  MINIMAP_MARGIN,
  MINIMAP_MAX_HEIGHT,
  MINIMAP_MAX_WIDTH,
  MINIMAP_PADDING,
  MINIMAP_VIEWPORT_SHARE,
} from "@/config/drawing.config";
import { documentRect } from "@/lib/camera.utils";
import {
  minimapImageRect,
  minimapLayout,
  minimapPointDocument,
  minimapWindow,
} from "@/lib/minimap.utils";
import type { Camera } from "@/types/engine/drawing";

const VIEWPORT = { height: 600, width: 800 };
const SQUARE = { height: 420, width: 420 };

const camera = (x: number, y: number, zoom: number): Camera => ({ x, y, zoom });

describe("minimap layout", () => {
  test("a square document keeps its aspect inside the limits", () => {
    const layout = minimapLayout(SQUARE, VIEWPORT);

    expect(layout.image.width).toBe(MINIMAP_MAX_HEIGHT);
    expect(layout.image.height).toBe(MINIMAP_MAX_HEIGHT);
    expect(layout.scale).toBeCloseTo(MINIMAP_MAX_HEIGHT / 420, 9);
  });

  test("a wide document is limited by the width", () => {
    const layout = minimapLayout({ height: 540, width: 1920 }, VIEWPORT);

    expect(layout.image.width).toBe(MINIMAP_MAX_WIDTH);
    expect(layout.image.height).toBeLessThanOrEqual(MINIMAP_MAX_HEIGHT);
  });

  test("the panel sits in the top right corner of the viewport", () => {
    const layout = minimapLayout(SQUARE, VIEWPORT);

    expect(layout.panel.x + layout.panel.width).toBe(
      VIEWPORT.width - MINIMAP_MARGIN
    );
    expect(layout.panel.y).toBe(MINIMAP_MARGIN);
  });

  test("the thumbnail sits inside the panel with its padding", () => {
    const layout = minimapLayout(SQUARE, VIEWPORT);

    expect(layout.image.x - layout.panel.x).toBe(MINIMAP_PADDING);
    expect(layout.image.y - layout.panel.y).toBe(MINIMAP_PADDING);
    expect(layout.panel.width - layout.image.width).toBe(MINIMAP_PADDING * 2);
    expect(layout.panel.height - layout.image.height).toBe(MINIMAP_PADDING * 2);
  });

  test("in a tiny viewport the panel still ends at the margin", () => {
    const viewport = { height: 40, width: 40 };
    const layout = minimapLayout(SQUARE, viewport);

    expect(layout.panel.width).toBeLessThan(viewport.width);
    expect(layout.panel.x + layout.panel.width).toBe(
      viewport.width - MINIMAP_MARGIN
    );
  });

  test("when even that does not fit the panel starts at zero", () => {
    const viewport = { height: 20, width: 20 };
    const layout = minimapLayout(SQUARE, viewport);

    expect(layout.panel.x).toBe(0);
    expect(layout.panel.y).toBe(MINIMAP_MARGIN);
  });

  test("on a small canvas the panel keeps only its share of the viewport", () => {
    const viewport = { height: 420, width: 420 };
    const layout = minimapLayout(SQUARE, viewport);

    expect(layout.image.width).toBe(
      Math.round(420 * MINIMAP_VIEWPORT_SHARE)
    );
    expect(layout.panel.width).toBeLessThan(viewport.width / 2);
  });

  test("a document rectangle lands on the thumbnail in the same place", () => {
    const layout = minimapLayout(SQUARE, VIEWPORT);
    const rect = minimapImageRect(
      { height: 210, width: 105, x: 105, y: 0 },
      layout
    );

    expect(rect.width).toBeCloseTo(layout.image.width / 4, 9);
    expect(rect.height).toBeCloseTo(layout.image.height / 2, 9);
    expect(rect.x - layout.image.x).toBeCloseTo(layout.image.width / 4, 9);
    expect(rect.y).toBeCloseTo(layout.image.y, 9);
  });
});

describe("minimap window", () => {
  test("at zoom one it covers the whole sheet", () => {
    const layout = minimapLayout(SQUARE, VIEWPORT);
    const window = minimapWindow(camera(0, 0, 1), SQUARE, SQUARE, layout);

    expect(window.x).toBeCloseTo(layout.image.x, 9);
    expect(window.y).toBeCloseTo(layout.image.y, 9);
    expect(window.width).toBeCloseTo(layout.image.width, 9);
    expect(window.height).toBeCloseTo(layout.image.height, 9);
  });

  test("its size is the visible part of the document, scaled", () => {
    const layout = minimapLayout(SQUARE, VIEWPORT);
    const window = minimapWindow(camera(0, 0, 2), VIEWPORT, SQUARE, layout);

    // At double zoom the viewport shows half the sheet: 400x300 of 420
    // document pixels, which is most of a square thumbnail.
    expect(window.width).toBeCloseTo((VIEWPORT.width / 2) * layout.scale, 9);
    expect(window.height).toBeCloseTo((VIEWPORT.height / 2) * layout.scale, 9);
    expect(window.width / layout.image.width).toBeCloseTo(400 / 420, 9);
  });

  test("panning moves it against the sheet", () => {
    const layout = minimapLayout(SQUARE, VIEWPORT);
    const still = minimapWindow(camera(0, 0, 2), VIEWPORT, SQUARE, layout);
    const moved = minimapWindow(camera(50, 0, 2), VIEWPORT, SQUARE, layout);

    // 50 screen pixels are 25 document pixels at double zoom.
    expect(still.x - moved.x).toBeCloseTo((50 / 2) * layout.scale, 9);
    expect(moved.y).toBeCloseTo(still.y, 9);
  });

  test("a sheet moved off screen keeps its window outside the thumbnail", () => {
    const layout = minimapLayout(SQUARE, VIEWPORT);
    const sheet = documentRect(camera(-10_000, 0, 1), VIEWPORT, SQUARE);
    const window = minimapWindow(camera(-10_000, 0, 1), VIEWPORT, SQUARE, layout);

    expect(sheet.x + sheet.width).toBeLessThan(0);
    expect(window.x).toBeGreaterThan(layout.image.x + layout.image.width);
  });
});

describe("minimap pointer", () => {
  test("the middle of the thumbnail is the middle of the document", () => {
    const layout = minimapLayout(SQUARE, VIEWPORT);
    const middle = minimapPointDocument(
      {
        x: layout.image.x + layout.image.width / 2,
        y: layout.image.y + layout.image.height / 2,
      },
      SQUARE,
      layout
    );

    expect(middle).toEqual({ x: 210, y: 210 });
  });

  test("the thumbnail corners are the document corners", () => {
    const layout = minimapLayout(SQUARE, VIEWPORT);

    expect(
      minimapPointDocument(
        { x: layout.image.x, y: layout.image.y },
        SQUARE,
        layout
      )
    ).toEqual({ x: 0, y: 0 });
    expect(
      minimapPointDocument(
        {
          x: layout.image.x + layout.image.width,
          y: layout.image.y + layout.image.height,
        },
        SQUARE,
        layout
      )
    ).toEqual({ x: 420, y: 420 });
  });

  test("a pointer on the padding is clamped to the sheet edge", () => {
    const layout = minimapLayout(SQUARE, VIEWPORT);
    const point = minimapPointDocument(
      { x: layout.panel.x + 1, y: layout.panel.y + 1 },
      SQUARE,
      layout
    );

    expect(point).toEqual({ x: 0, y: 0 });
  });

  test("off the panel there is no document point", () => {
    const layout = minimapLayout(SQUARE, VIEWPORT);

    expect(minimapPointDocument({ x: 10, y: 10 }, SQUARE, layout)).toBeNull();
    expect(
      minimapPointDocument(
        { x: layout.panel.x, y: layout.panel.y + layout.panel.height + 1 },
        SQUARE,
        layout
      )
    ).toBeNull();
  });
});
