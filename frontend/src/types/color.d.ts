import type { ReactNode } from "react";

export type RGB = { r: number; g: number; b: number };

export type HSV = { h: number; s: number; v: number };

export type HSL = { h: number; s: number; l: number };

export type ColorFormat = "hex" | "rgb" | "hsl";

export type ChannelFormat = "rgb" | "hsl";

export type ChannelConfig = {
  maxs: [number, number, number];
  thresholds: [number, number, number];
};

export type ColorPickerPanelProps = {
  value: string;
  onChange: (hex: string) => void;
  className?: string;
};

export type SaturationValueAreaProps = {
  hue: number;
  saturation: number;
  value: number;
  onChange: (next: { saturation: number; value: number }) => void;
  className?: string;
};

export type ChannelInputsProps = {
  format: ChannelFormat;
  hsv: HSV;
  commit: (next: HSV) => void;
};

export type ColorPickerProps = {
  value: string;
  onChange: (hex: string) => void;
  children?: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
};
