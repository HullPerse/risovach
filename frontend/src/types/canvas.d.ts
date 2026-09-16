export interface Point {
  x: number;
  y: number;
}

export type CanvasTool = "draw" | "eraser" | "eyedropper";

export interface RequestImageOptions {
  filename?: string;
}
