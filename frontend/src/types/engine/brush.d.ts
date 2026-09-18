export interface BrushSettings {
  color: string;
  hardness: number;
  opacity: number;
  size: number;
  spacing: number;
}

export interface StrokeSample {
  pressure: number;
  tiltX: number;
  tiltY: number;
  time: number;
  x: number;
  y: number;
}
