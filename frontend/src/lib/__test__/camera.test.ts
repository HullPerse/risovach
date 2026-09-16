import { describe, expect, test } from "bun:test";

import {
  clampCamera,
  createCamera,
  documentRect,
  documentToScreen,
  screenToDocument,
  zoomCameraAt,
} from "@/lib/camera.utils";

const VIEWPORT = { height: 600, width: 800 };
const DOCUMENT = { height: 1080, width: 1920 };
const LIMITS = { max: 16, min: 0.05 };

describe("camera", () => {
  test("the document centre matches the viewport centre", () => {
    const camera = createCamera(1);

    expect(
      documentToScreen(camera, VIEWPORT, DOCUMENT, { x: 960, y: 540 })
    ).toEqual({ x: 400, y: 300 });
  });

  test("screen conversion and back keeps the point", () => {
    const camera = { x: 120, y: -40, zoom: 2.5 };
    const screen = documentToScreen(camera, VIEWPORT, DOCUMENT, {
      x: 1234,
      y: 567,
    });
    const back = screenToDocument(camera, VIEWPORT, DOCUMENT, screen);

    expect(back.x).toBeCloseTo(1234, 6);
    expect(back.y).toBeCloseTo(567, 6);
  });

  test("zoom at a point keeps the point under the pointer", () => {
    const camera = createCamera(1);
    const pointer = { x: 700, y: 120 };
    const before = screenToDocument(camera, VIEWPORT, DOCUMENT, pointer);
    const zoomed = zoomCameraAt(
      camera,
      VIEWPORT,
      DOCUMENT,
      pointer,
      1.5,
      LIMITS
    );
    const after = screenToDocument(zoomed, VIEWPORT, DOCUMENT, pointer);

    expect(zoomed.zoom).toBeCloseTo(1.5, 6);
    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.y).toBeCloseTo(before.y, 6);
  });

  test("zoom is capped from above", () => {
    const zoomed = zoomCameraAt(
      createCamera(10),
      VIEWPORT,
      DOCUMENT,
      { x: 400, y: 300 },
      2,
      LIMITS
    );

    expect(zoomed.zoom).toBe(16);
  });

  test("zoom is capped from below", () => {
    const zoomed = zoomCameraAt(
      createCamera(0.06),
      VIEWPORT,
      DOCUMENT,
      { x: 400, y: 300 },
      0.5,
      LIMITS
    );

    expect(zoomed.zoom).toBe(0.05);
  });

  test("a document the size of the viewport does not pan", () => {
    const viewport = { height: 420, width: 420 };
    const document = { height: 420, width: 420 };
    const clamped = clampCamera(
      { x: 10_000, y: -10_000, zoom: 1 },
      viewport,
      document,
      true
    );

    expect(clamped).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  test("a document smaller than the viewport moves in free space only", () => {
    const clamped = clampCamera(
      { x: 10_000, y: 0, zoom: 1 },
      { height: 420, width: 420 },
      { height: 200, width: 200 },
      true
    );

    expect(clamped.x).toBe(110);
  });

  test("a large document can be panned to its edges", () => {
    const clamped = clampCamera(
      { x: 10_000, y: 0, zoom: 1 },
      { height: 420, width: 420 },
      { height: 1080, width: 1920 },
      true
    );

    expect(clamped.x).toBe(750);
    expect(clamped.y).toBe(0);
  });

  test("with clamping off the pan stays unchanged", () => {
    const camera = { x: 10_000, y: -10_000, zoom: 1 };

    expect(
      clampCamera(camera, { height: 420, width: 420 }, { height: 420, width: 420 }, false)
    ).toBe(camera);
  });

  test("the document rectangle is the corner and size with zoom", () => {
    expect(documentRect(createCamera(1), VIEWPORT, DOCUMENT)).toEqual({
      height: 1080,
      width: 1920,
      x: -560,
      y: -240,
    });
  });

  test("zoom grows the rectangle around the same centre", () => {
    const rect = documentRect(createCamera(2), VIEWPORT, DOCUMENT);

    expect(rect).toEqual({ height: 2160, width: 3840, x: -1520, y: -780 });
  });

  test("panning moves the rectangle whole", () => {
    const rect = documentRect(
      { x: 100, y: -50, zoom: 1 },
      VIEWPORT,
      DOCUMENT
    );

    expect(rect.x).toBe(-460);
    expect(rect.y).toBe(-290);
  });
});
