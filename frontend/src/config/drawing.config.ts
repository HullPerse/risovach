import type { BrushSettings } from "@/types/engine/brush";
import type { Size } from "@/types/engine/drawing";

export const CAMERA_ZOOM_MIN = 0.05;
export const CAMERA_ZOOM_MAX = 16;
export const CAMERA_ZOOM_STEP = 1.08;
export const CAMERA_LIMIT_TO_BOUNDS = true;
// Small documents are fitted without upscaling past their real size.
export const CAMERA_FIT_MAX_SCALE = 1;

export const DEFAULT_BRUSH: BrushSettings = {
  color: "#000000",
  hardness: 1,
  opacity: 1,
  size: 8,
  spacing: 0.25,
};

export const DEFAULT_DOCUMENT_SIZE = { height: 1920, width: 1920 } as const;

export const MAG_SIZE = 130;
export const MAG_SOURCE = 13;
export const MAG_CELL = MAG_SIZE / MAG_SOURCE;

export const MIN_CURSOR_RADIUS = 3;
export const CURSOR_GAP = 18;

export const BRUSH_START_MARGIN = 5;

export const EMPTY_VIEWPORT: Size = { height: 0, width: 0 };
export const PADDING = 2;

/**
 * Wire protocol with the Rust core. Values must match the core exactly:
 * tuning them here alone breaks the packing on both sides.
 */
/** Six numbers per sample: x, y, pressure, tilt x, tilt y, time. */
export const SAMPLE_STRIDE = 6;

/** Overlay blend mode id on the core side. */
export const MODE_DESTINATION_OUT = 1;

/** Zero means "no stroke": layer ids start at one. */
export const NO_OVERLAY = 0;

/** Outside the document the core returns a value above any 0xRRGGBB. */
export const MAX_COLOR = 0xff_ff_ff;
