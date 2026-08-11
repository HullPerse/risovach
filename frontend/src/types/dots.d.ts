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

export type GridState = {
  grid: GridInfo;
  skipAnimation: boolean;
};
