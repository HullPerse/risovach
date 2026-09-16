import type { Point } from "@/types/canvas";
import type { Camera, Rect, Size, ZoomLimits } from "@/types/drawing";

const clamp = (value: number, min: number, max: number) => {
  const clamped = Math.min(max, Math.max(min, value));

  // negative zero in the camera offset is useless and breaks comparisons
  return clamped === 0 ? 0 : clamped;
};

export const createCamera = (zoom: number): Camera => ({ x: 0, y: 0, zoom });

export const clampZoom = (zoom: number, limits: ZoomLimits): number =>
  clamp(zoom, limits.min, limits.max);

export const documentToScreen = (
  camera: Camera,
  viewport: Size,
  document: Size,
  point: Point
): Point => ({
  x: (point.x - document.width / 2) * camera.zoom + viewport.width / 2 + camera.x,
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
  x: (point.x - viewport.width / 2 - camera.x) / camera.zoom + document.width / 2,
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

export const clampCamera = (
  camera: Camera,
  viewport: Size,
  document: Size,
  limitToBounds: boolean
): Camera => {
  if (!limitToBounds) {
    return camera;
  }

  // The document always stays on screen: when it fits whole, panning is
  // limited to the free space; when it is larger, its edges are reachable.
  const maxX = Math.abs(viewport.width - document.width * camera.zoom) / 2;
  const maxY = Math.abs(viewport.height - document.height * camera.zoom) / 2;

  return {
    ...camera,
    x: clamp(camera.x, -maxX, maxX),
    y: clamp(camera.y, -maxY, maxY),
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

  if (zoom === camera.zoom) {
    return camera;
  }

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
