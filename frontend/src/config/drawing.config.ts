import type { BrushSettings } from "@/types/engine/brush";
import type { CanvasTool } from "@/types/engine/canvas";
import type { Size } from "@/types/engine/drawing";

export const CAMERA_ZOOM_MIN = 0.05;
export const CAMERA_ZOOM_MAX = 16;
export const CAMERA_ZOOM_STEP = 1.08;
// The sheet does not stick to the edges: it can be panned off the screen, and
// the minimap plus "fit" are the way back. Clamping the camera here was what
// used to keep it in sight.
// Small documents are fitted without upscaling past their real size.
export const CAMERA_FIT_MAX_SCALE = 1;

export const MINIMAP_MAX_WIDTH = 168;
export const MINIMAP_MAX_HEIGHT = 112;
// Share of the viewport one side of the panel may take. On a small canvas
// like the 420x420 avatar the panel would otherwise eat a corner of it.
export const MINIMAP_VIEWPORT_SHARE = 0.25;
export const MINIMAP_MARGIN = 10;
export const MINIMAP_PADDING = 4;
// Hovering the panel makes it lighter instead of hiding it: a hidden panel
// could not be dragged, and dragging is the whole point of the minimap.
export const MINIMAP_HOVER_ALPHA = 0.6;

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

// The loupe is an almond eye MAG_SIZE wide showing 8 of 13 source rows.
export const MAG_EYE_HEIGHT = 80;
// Reticle corner arm length, screen pixels. The cell itself is the sampled
// document pixel; below this size the cell is grown around its centre, or the
// corners would collapse into a dot when zoomed out.
export const MAG_RETICLE_ARM = 3;
export const MAG_CELL_MIN = 8;
// Hard shadow shift under a floating panel: the loupe eye and the minimap.
export const OVERLAY_SHADOW = 4;
// Hex name plate under the eye.
export const MAG_LABEL_HEIGHT = 14;
export const MAG_LABEL_GAP = 4;

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

/**
 * Tool id the core receives. Values must match `TOOL_*` in
 * `frontend/engine/wasm/src/lib.rs`: a mismatch silently picks another brush.
 *
 * The eyedropper and the fill never start a stroke, so both go as `draw`: they
 * change nothing about how the core stamps.
 */
export const CORE_TOOL: Record<CanvasTool, number> = {
  draw: 0,
  eraser: 1,
  eyedropper: 0,
  fill: 0,
  pencil: 2,
};

/** Zero means "no stroke": layer ids start at one. */
export const NO_OVERLAY = 0;

/** Outside the document the core returns a value above any 0xRRGGBB. */
export const MAX_COLOR = 0xff_ff_ff;
