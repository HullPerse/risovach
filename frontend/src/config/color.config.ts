import type {
  ChannelConfig,
  ChannelFormat,
  ColorFormat,
} from "@/types/shared/color";

export const FORMATS: ColorFormat[] = ["hex", "rgb", "hsl"];

export const FORMAT_PREFIX: Record<ColorFormat, string> = {
  hex: "HEX",
  hsl: "HSL",
  rgb: "RGB",
};

export const CHANNEL_CONFIG: Record<ChannelFormat, ChannelConfig> = {
  hsl: { maxs: [360, 100, 100], thresholds: [36, 10, 10] },
  rgb: { maxs: [255, 255, 255], thresholds: [25, 25, 25] },
};

export const CHANNEL_LABELS: Record<ChannelFormat, [string, string, string]> = {
  hsl: ["h", "s", "l"],
  rgb: ["r", "g", "b"],
};

export const HUE_MAP: [number, number, number][] = [
  [0, 1, 2],
  [1, 0, 2],
  [2, 0, 1],
  [2, 1, 0],
  [1, 2, 0],
  [0, 2, 1],
];
