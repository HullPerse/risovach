import type { ChannelConfig, ChannelFormat, ColorFormat } from "@/types/color";

export const FORMATS: ColorFormat[] = ["hex", "rgb", "hsl"];

export const FORMAT_PREFIX: Record<ColorFormat, string> = {
  hex: "HEX",
  rgb: "RGB",
  hsl: "HSL",
};

export const CHANNEL_CONFIG: Record<ChannelFormat, ChannelConfig> = {
  rgb: { maxs: [255, 255, 255], thresholds: [25, 25, 25] },
  hsl: { maxs: [360, 100, 100], thresholds: [36, 10, 10] },
};
