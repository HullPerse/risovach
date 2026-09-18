import { describe, expect, test } from "bun:test";

import {
  centerCameraOn,
  createCamera,
  documentRect,
  documentToScreen,
  panCamera,
  screenRectToDocument,
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

  test("a centred camera puts the point in the middle of the viewport", () => {
    const camera = centerCameraOn(createCamera(2), DOCUMENT, {
      x: 1500,
      y: 200,
    });

    expect(documentToScreen(camera, VIEWPORT, DOCUMENT, { x: 1500, y: 200 })).toEqual(
      { x: 400, y: 300 }
    );
  });

  test("the camera saves no zoom of its own", () => {
    expect(centerCameraOn({ x: 9, y: 9, zoom: 0.4 }, DOCUMENT, { x: 0, y: 0 })).toEqual(
      { x: 384, y: 216, zoom: 0.4 }
    );
  });

  test("a sheet can be moved right off the screen", () => {
    // The pan used to be clamped to the free space; with the clamp gone a far
    // away camera stays exactly where the drag left it.
    expect(panCamera(createCamera(1), { x: 40_000, y: -40_000 })).toEqual({
      x: 40_000,
      y: -40_000,
      zoom: 1,
    });
  });

  test("a screen rectangle converts to the document area it covers", () => {
    const camera = { x: 30, y: -20, zoom: 2 };
    const screen = { height: 100, width: 200, x: 120, y: 80 };
    const area = screenRectToDocument(camera, VIEWPORT, DOCUMENT, screen);

    expect(area.width * camera.zoom).toBeCloseTo(screen.width, 6);
    expect(area.height * camera.zoom).toBeCloseTo(screen.height, 6);

    const corner = screenToDocument(camera, VIEWPORT, DOCUMENT, {
      x: screen.x,
      y: screen.y,
    });

    expect(area.x).toBeCloseTo(corner.x, 6);
    expect(area.y).toBeCloseTo(corner.y, 6);
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
