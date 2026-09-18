import {
  MINIMAP_MARGIN,
  MINIMAP_MAX_HEIGHT,
  MINIMAP_MAX_WIDTH,
  MINIMAP_PADDING,
  MINIMAP_VIEWPORT_SHARE,
} from "@/config/drawing.config";
import { documentRect } from "@/lib/camera.utils";
import type { Point } from "@/types/engine/canvas";
import type { Camera, MinimapLayout, Rect, Size } from "@/types/engine/drawing";

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const inside = (point: Point, rect: Rect): boolean =>
  point.x >= rect.x &&
  point.y >= rect.y &&
  point.x <= rect.x + rect.width &&
  point.y <= rect.y + rect.height;

/**
 * Panel and thumbnail for a document in a viewport. The panel sits in the top
 * right corner, the thumbnail keeps the document aspect and never grows past
 * its own limits or past its share of the viewport, so the same function
 * serves the drawing and the hit test: input finds the panel with it instead
 * of asking the overlay for state.
 *
 * One unit of both `document` and the result is a CSS pixel; the output canvas
 * scales by the device ratio itself.
 */
export const minimapLayout = (document: Size, viewport: Size): MinimapLayout => {
  const scale = Math.min(
    MINIMAP_MAX_WIDTH / document.width,
    MINIMAP_MAX_HEIGHT / document.height,
    (viewport.width * MINIMAP_VIEWPORT_SHARE) / document.width,
    (viewport.height * MINIMAP_VIEWPORT_SHARE) / document.height
  );
  const width = Math.max(1, Math.round(document.width * scale));
  const height = Math.max(1, Math.round(document.height * scale));
  // A viewport narrower than the panel would push it off screen: the origin
  // stays at zero and the canvas clips the panel instead.
  const panelX = Math.max(0, viewport.width - MINIMAP_MARGIN - width - MINIMAP_PADDING * 2);

  return {
    image: {
      height,
      width,
      x: panelX + MINIMAP_PADDING,
      y: MINIMAP_MARGIN + MINIMAP_PADDING,
    },
    panel: {
      height: height + MINIMAP_PADDING * 2,
      width: width + MINIMAP_PADDING * 2,
      x: panelX,
      y: MINIMAP_MARGIN,
    },
    scale,
  };
};

/** Thumbnail rectangle of a document rectangle: the same place, scaled. */
export const minimapImageRect = (rect: Rect, layout: MinimapLayout): Rect => ({
  height: rect.height * layout.scale,
  width: rect.width * layout.scale,
  x: layout.image.x + rect.x * layout.scale,
  y: layout.image.y + rect.y * layout.scale,
});

/**
 * Part of the document the viewport shows, as a thumbnail rectangle. Without
 * clamping: a sheet panned off the screen gives a window rectangle outside the
 * thumbnail, and clipping it to the panel is the drawing call's business.
 */
export const minimapWindow = (
  camera: Camera,
  viewport: Size,
  document: Size,
  layout: MinimapLayout
): Rect => {
  const sheet = documentRect(camera, viewport, document);

  return minimapImageRect(
    {
      height: viewport.height / camera.zoom,
      width: viewport.width / camera.zoom,
      x: -sheet.x / camera.zoom,
      y: -sheet.y / camera.zoom,
    },
    layout
  );
};

/** Document point under a pointer on the panel, or null outside it. */
export const minimapPointDocument = (
  point: Point,
  document: Size,
  layout: MinimapLayout
): Point | null => {
  if (!inside(point, layout.panel)) return null;

  return {
    x: clamp((point.x - layout.image.x) / layout.scale, 0, document.width),
    y: clamp((point.y - layout.image.y) / layout.scale, 0, document.height),
  };
};
