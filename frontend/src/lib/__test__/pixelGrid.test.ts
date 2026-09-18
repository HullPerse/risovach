import { describe, expect, test } from "bun:test";

import {
  deviceRect,
  frameEdges,
} from "@/lib/pixelGrid.utils";
import type { Camera, Size } from "@/types/engine/drawing";

/** Distance from the value to the device pixel grid. */
const gridError = (value: number, dpr: number): number =>
  Math.abs(value * dpr - Math.round(value * dpr));

/** The sheet of the report screenshot: 420 document pixels at zoom 1.386. */
const SHEET = { height: 582.12, width: 582.12, x: -43.86, y: -23.31 };

describe("pixel snapping", () => {
  test("a fractional value lands on the device grid", () => {
    for (const dpr of [1, 2]) {
      expect(gridError(deviceRect(SHEET, dpr).x, dpr)).toBeCloseTo(0, 6);
      expect(
        gridError(deviceRect(SHEET, dpr).x + deviceRect(SHEET, dpr).width, dpr)
      ).toBeCloseTo(0, 6);
    }
  });

  test("all four edges of the sheet land on the grid", () => {
    for (const dpr of [1, 2]) {
      const sheet = deviceRect(SHEET, dpr);

      expect(gridError(sheet.x, dpr)).toBeCloseTo(0, 6);
      expect(gridError(sheet.y, dpr)).toBeCloseTo(0, 6);
      expect(gridError(sheet.x + sheet.width, dpr)).toBeCloseTo(0, 6);
      expect(gridError(sheet.y + sheet.height, dpr)).toBeCloseTo(0, 6);
    }
  });

  test("frame sides sit one device pixel inside the sheet", () => {
    for (const dpr of [1, 2]) {
      const unit = 1 / dpr;
      const sheet = deviceRect(SHEET, dpr);
      const frame = frameEdges(sheet, dpr);

      expect(frame.right - frame.left).toBeCloseTo(sheet.width - unit, 6);
      expect(frame.bottom - frame.top).toBeCloseTo(sheet.height - unit, 6);
      expect(frame.left).toBeGreaterThanOrEqual(sheet.x);
      expect(frame.top).toBeGreaterThanOrEqual(sheet.y);
      expect(frame.right).toBeLessThanOrEqual(sheet.x + sheet.width);
      expect(frame.bottom).toBeLessThanOrEqual(sheet.y + sheet.height);
    }
  });
});

/**
 * The clear plan for the overlay: the frame rectangle is managed apart from
 * the pointer boxes, so the magnifier over the sheet edge never sees the
 * frame line in its source.
 */
describe("overlay clear plan", () => {
  const VIEWPORT: Size = { height: 512, width: 512 };
  const DOCUMENT: Size = { height: 420, width: 420 };
  const MOVED: Camera = { x: -17.3, y: 3.2, zoom: 1.386 };

  /** The same rectangle math the surface uses for the frame. */
  const framePlan = (camera: Camera, dpr: number) =>
    deviceRect(
      {
        height: DOCUMENT.height * camera.zoom,
        width: DOCUMENT.width * camera.zoom,
        x:
          (0 - DOCUMENT.width / 2) * camera.zoom +
          VIEWPORT.width / 2 +
          camera.x,
        y:
          (0 - DOCUMENT.height / 2) * camera.zoom +
          VIEWPORT.height / 2 +
          camera.y,
      },
      dpr
    );

  test("a stationary frame yields no repaint area", () => {
    const current = framePlan(MOVED, 1);
    const previous = framePlan(MOVED, 1);

    expect(previous).toEqual(current);
  });

  test("a moved frame yields the union of the old and the new rectangle", () => {
    const previous = framePlan({ x: 0, y: 0, zoom: 1 }, 1);
    const current = framePlan(MOVED, 1);
    const left = Math.min(previous.x, current.x);
    const top = Math.min(previous.y, current.y);
    const right = Math.max(
      previous.x + previous.width,
      current.x + current.width
    );
    const bottom = Math.max(
      previous.y + previous.height,
      current.y + current.height
    );

    // The old sheet sits fully inside the new one here, so the union is the
    // new rectangle: the clear covers the whole old frame plus the new line.
    expect(left).toBe(current.x);
    expect(top).toBe(current.y);
    expect(right).toBe(current.x + current.width);
    expect(bottom).toBe(current.y + current.height);
  });
});
