import { HUE_MAP } from "@/config/color.config";
import type {
  ChannelFormat,
  ColorFormat,
  HSL,
  HSV,
  RGB,
} from "@/types/shared/color";

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const toHex = (value: number): string => {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
};

const normalizeHue = (hue: number): number => (hue + 360) % 360;

const getHueValues = (c: number, x: number, h: number): number[] => {
  const values = [c, x, 0];
  const [ri, gi, bi] = HUE_MAP[Math.min(5, Math.floor(h / 60))];

  return [values[ri], values[gi], values[bi]];
};

const getHue = (
  rn: number,
  gn: number,
  bn: number,
  max: number,
  delta: number
): number => {
  if (max === rn) return normalizeHue(60 * (((gn - bn) / delta) % 6));
  if (max === gn) return normalizeHue(60 * ((bn - rn) / delta + 2));
  return normalizeHue(60 * ((rn - gn) / delta + 4));
};

const chromaToRgb = (c: number, x: number, m: number, h: number): RGB => {
  const [r, g, b] = getHueValues(c, x, h);

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
};

export const hsvToRgb = ({ h, s, v }: HSV): RGB => {
  const sat = s / 100;
  const val = v / 100;

  const c = val * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = val - c;

  return chromaToRgb(c, x, m, h);
};

export const rgbToHsv = ({ r, g, b }: RGB): HSV => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const h = delta === 0 ? 0 : getHue(rn, gn, bn, max, delta);
  const s = max === 0 ? 0 : delta / max;

  return {
    h,
    s: s * 100,
    v: max * 100,
  };
};

export const rgbToHsl = ({ r, g, b }: RGB): HSL => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const l = (max + min) / 2;
  const h = delta === 0 ? 0 : getHue(rn, gn, bn, max, delta);
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
};

export const hslToRgb = ({ h, s, l }: HSL): RGB => {
  const sat = s / 100;
  const light = l / 100;

  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;

  return chromaToRgb(c, x, m, h);
};

export const rgbToHex = ({ r, g, b }: RGB): string => {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
};

export const hexToRgb = (hex: string): RGB | null => {
  let value = hex.trim().replace(/^#/u, "");

  if (value.length === 3) {
    value = [...value].map((channel) => channel + channel).join("");
  }

  if (!/^[0-9a-fA-F]{6}$/u.test(value)) return null;

  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
};

export const hsvToHex = (hsv: HSV): string => rgbToHex(hsvToRgb(hsv));

export const hexToHsv = (hex: string): HSV | null => {
  const rgb = hexToRgb(hex);

  if (!rgb) return null;
  return rgbToHsv(rgb);
};

export const hslToHsv = (h: number, s: number, l: number) => {
  const saturation = s / 100;
  const lightness = l / 100;

  const value = lightness + saturation * Math.min(lightness, 1 - lightness);
  const hsvSaturation = value === 0 ? 0 : (2 * (value - lightness)) / value;

  return {
    h,
    s: hsvSaturation * 100,
    v: value * 100,
  };
};

export const hsvToChannelStrings = (
  hsv: HSV,
  format: ChannelFormat
): [string, string, string] => {
  if (format === "rgb") {
    const { r, g, b } = hsvToRgb(hsv);

    return [String(r), String(g), String(b)];
  }

  const { h, s, l } = rgbToHsl(hsvToRgb(hsv));

  return [String(h), String(s), String(l)];
};

const FORMATTERS: Record<ColorFormat, (rgb: RGB) => string> = {
  hex: (rgb) => rgbToHex(rgb),
  rgb: (rgb) => `${rgb.r}, ${rgb.g}, ${rgb.b}`,
  hsl: (rgb) => {
    const hsl = rgbToHsl(rgb);

    return `${hsl.h}, ${hsl.s}%, ${hsl.l}%`;
  },
};

export const formatColor = (hsv: HSV, format: ColorFormat): string => {
  return FORMATTERS[format](hsvToRgb(hsv));
};

export const parseColor = (input: string, format: ColorFormat): HSV | null => {
  const value = input.trim();

  if (format === "hex") return hexToHsv(value);

  const numbers = value
    .replaceAll(/[^0-9.,%-]/gu, " ")
    .split(/[\s,]+/u)
    .filter(Boolean)
    .map((part) => Number(part.replace("%", "")));

  if (numbers.length < 3 || numbers.some(Number.isNaN)) return null;

  if (format === "rgb") {
    const [r, g, b] = numbers;

    return rgbToHsv({
      r: clamp(r, 0, 255),
      g: clamp(g, 0, 255),
      b: clamp(b, 0, 255),
    });
  }

  const [h, s, l] = numbers;

  return rgbToHsv(
    hslToRgb({
      h: clamp(h, 0, 360),
      s: clamp(s, 0, 100),
      l: clamp(l, 0, 100),
    })
  );
};

export { clamp };
