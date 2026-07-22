export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 100;
export const DEFAULT_ZOOM_STEP = 1.08;
export const DEFAULT_INITIAL_ZOOM = 1;
export const DEFAULT_LIMIT_TO_BOUNDS = true;
export const DEFAULT_PANNING = {
  allowLeftClickPan: false,
  allowMiddleClickPan: false,
  allowRightClickPan: true,
} as const;

export const DEFAULT_BRUSH_SIZE_RANGE = { min: 0, max: 100 } as const;
export const DEFAULT_BRUSH_OPACITY = 1;

export const PALETTE_COLORS = [
  { name: "black", hex: "#000000" },
  { name: "grey", hex: "#808080" },
  { name: "white", hex: "#ffffff" },
  { name: "red", hex: "#e53935" },
  { name: "light-red", hex: "#ff8a80" },
  { name: "orange", hex: "#ff8a65" },
  { name: "yellow", hex: "#ffd54f" },
  { name: "light-green", hex: "#81c784" },
  { name: "green", hex: "#4caf50" },
  { name: "light-blue", hex: "#8ab4ff" },
  { name: "blue", hex: "#3d7eff" },
  { name: "violet", hex: "#7c4dff" },
  { name: "light-violet", hex: "#c8bfff" },
  { name: "pink", hex: "#f06292" },
  { name: "teal", hex: "#26a69a" },
];
