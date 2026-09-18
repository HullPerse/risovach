export interface GridDot {
  x: number;
  y: number;
}

export interface GridInfo {
  dots: GridDot[];
  cols: number;
  rows: number;
  spacing: number;
  sx: number;
  sy: number;
}

export interface LineData {
  born: number;
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

export interface GridState {
  grid: GridInfo;
  skipAnimation: boolean;
}

export interface GridWindow {
  maxCol: number;
  maxRow: number;
  minCol: number;
  minRow: number;
}

export interface Rgb {
  r: number;
  g: number;
  b: number;
}
