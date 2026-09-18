import type { Point } from "@/types/engine/canvas";
import type { Camera, Rect, Size, ZoomLimits } from "@/types/engine/drawing";

const clamp = (value: number, min: number, max: number): number => {
  const clamped = Math.min(max, Math.max(min, value));

  // if -0 it returns 0, otherwise clamped
  return clamped + 0;
};


export const createCamera = (zoom: number): Camera => ({ x: 0, y: 0, zoom });

export const clampZoom = (zoom: number, limits: ZoomLimits): number => {
  return clamp(zoom, limits.min, limits.max);
};

export const documentToScreen = (
  camera: Camera,
  viewport: Size,
  document: Size,
  point: Point
): Point => ({
  x:
    (point.x - document.width / 2) * camera.zoom +
    viewport.width / 2 +
    camera.x,
  y:
    (point.y - document.height / 2) * camera.zoom +
    viewport.height / 2 +
    camera.y,
});

export const screenToDocument = (
  camera: Camera,
  viewport: Size,
  document: Size,
  point: Point
): Point => ({
  x:
    (point.x - viewport.width / 2 - camera.x) / camera.zoom +
    document.width / 2,
  y:
    (point.y - viewport.height / 2 - camera.y) / camera.zoom +
    document.height / 2,
});

/**
 * Where the document sits on screen. Needed to clip the drawing by its own
 * bounds instead of the container edges.
 */
export const documentRect = (
  camera: Camera,
  viewport: Size,
  document: Size
): Rect => {
  const topLeft = documentToScreen(camera, viewport, document, { x: 0, y: 0 });

  return {
    height: document.height * camera.zoom,
    width: document.width * camera.zoom,
    x: topLeft.x,
    y: topLeft.y,
  };
};

export const panCamera = (camera: Camera, delta: Point): Camera => ({
  ...camera,
  x: camera.x + delta.x,
  y: camera.y + delta.y,
});

/**
 * Camera that puts a document point in the middle of the viewport. This is
 * the whole panning rule now: the sheet has no edges of its own, so no clamp
 * stands between the pointer and the view.
 *
 * The viewport size drops out of the formula: the offset of the middle of the
 * viewport cancels against the document centre in `documentToScreen`.
 */
export const centerCameraOn = (camera: Camera, document: Size, point: Point): Camera => ({
  ...camera,
  x: -((point.x - document.width / 2) * camera.zoom),
  y: -((point.y - document.height / 2) * camera.zoom),
});

/** Document rectangle a screen rectangle covers. */
export const screenRectToDocument = (
  camera: Camera,
  viewport: Size,
  document: Size,
  rect: Rect
): Rect => {
  const from = screenToDocument(camera, viewport, document, {
    x: rect.x,
    y: rect.y,
  });

  return {
    height: rect.height / camera.zoom,
    width: rect.width / camera.zoom,
    x: from.x,
    y: from.y,
  };
};

export const zoomCameraAt = (
  camera: Camera,
  viewport: Size,
  document: Size,
  screenPoint: Point,
  factor: number,
  limits: ZoomLimits
): Camera => {
  const zoom = clampZoom(camera.zoom * factor, limits);

  if (zoom === camera.zoom) return camera;

  const anchor = screenToDocument(camera, viewport, document, screenPoint);

  return {
    x:
      screenPoint.x -
      (anchor.x - document.width / 2) * zoom -
      viewport.width / 2,
    y:
      screenPoint.y -
      (anchor.y - document.height / 2) * zoom -
      viewport.height / 2,
    zoom,
  };
};
