import type { BrushSettings } from "@/types/brush";

export const CAMERA_ZOOM_MIN = 0.05;
export const CAMERA_ZOOM_MAX = 16;
export const CAMERA_ZOOM_STEP = 1.08;
export const CAMERA_LIMIT_TO_BOUNDS = true;

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
