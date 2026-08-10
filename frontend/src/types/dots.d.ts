export interface GridDot {
  x: number;
  y: number;
}

export interface GridInfo {
  dots: GridDot[];
  cols: number;
  rows: number;
  spacing: number;
}

export interface LineNode {
  born: number;
  el: SVGLineElement;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface DotGridProps {
  dots: GridDot[];
  cols: number;
  rows: number;
  spacing: number;
  setDotRef: (index: number, el: SVGCircleElement | null) => void;
}
