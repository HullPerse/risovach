import type { ReactNode } from "react";

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSV {
  h: number;
  s: number;
  v: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export type ColorFormat = "hex" | "rgb" | "hsl";

export type ChannelFormat = "rgb" | "hsl";

export interface ChannelConfig {
  maxs: [number, number, number];
  thresholds: [number, number, number];
}

export interface ColorPickerPanelProps {
  value: string;
  onChange: (hex: string) => void;
  className?: string;
}

export interface SaturationValueAreaProps {
  hue: number;
  saturation: number;
  value: number;
  onChange: (next: { saturation: number; value: number }) => void;
  className?: string;
}

export interface ChannelInputsProps {
  format: ChannelFormat;
  hsv: HSV;
  commit: (next: HSV) => void;
}

export interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  children?: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}
