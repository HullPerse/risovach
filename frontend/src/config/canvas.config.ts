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

export const DEFAULT_BRUSH_SIZE_RANGE = { max: 100, min: 0 } as const;
export const DEFAULT_BRUSH_OPACITY = 1;

export const PALETTE_COLORS = [
  { hex: "#000000", name: "black" },
  { hex: "#808080", name: "grey" },
  { hex: "#ffffff", name: "white" },
  { hex: "#e53935", name: "red" },
  { hex: "#ff8a80", name: "light-red" },
  { hex: "#ff8a65", name: "orange" },
  { hex: "#ffd54f", name: "yellow" },
  { hex: "#81c784", name: "light-green" },
  { hex: "#4caf50", name: "green" },
  { hex: "#8ab4ff", name: "light-blue" },
  { hex: "#3d7eff", name: "blue" },
  { hex: "#7c4dff", name: "violet" },
  { hex: "#c8bfff", name: "light-violet" },
  { hex: "#f06292", name: "pink" },
  { hex: "#26a69a", name: "teal" },
];

export const MAG_SIZE = 130;
export const MAG_SOURCE = 13;
export const MAG_CELL = MAG_SIZE / MAG_SOURCE;
