import type { ColorFormat, HSL, HSV, RGB } from "@/types/color";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const round = (value: number) => Math.round(value * 100) / 100;

export function hsvToRgb({ h, s, v }: HSV): RGB {
  const sat = s / 100;
  const val = v / 100;
  const c = val * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = val - c;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

export function rgbToHsv({ r, g, b }: RGB): HSV {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / delta + 2);
    else h = 60 * ((rn - gn) / delta + 4);
  }
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : delta / max;
  const v = max;

  return { h, s: s * 100, v: v * 100 };
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / delta + 2);
    else h = 60 * ((rn - gn) / delta + 4);
  }
  if (h < 0) h += 360;

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const toHex = (n: number) =>
    clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function hexToRgb(hex: string): RGB | null {
  let value = hex.trim().replace(/^#/, "");
  if (value.length === 3) {
    value = value
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return null;
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

export function hsvToHex(hsv: HSV): string {
  return rgbToHex(hsvToRgb(hsv));
}

export function hexToHsv(hex: string): HSV | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return rgbToHsv(rgb);
}

export function formatColor(hsv: HSV, format: ColorFormat): string {
  const rgb = hsvToRgb(hsv);
  switch (format) {
    case "hex":
      return rgbToHex(rgb);
    case "rgb":
      return `${rgb.r}, ${rgb.g}, ${rgb.b}`;
    case "hsl": {
      const hsl = rgbToHsl(rgb);
      return `${hsl.h}, ${hsl.s}%, ${hsl.l}%`;
    }
  }
}

export function parseColor(input: string, format: ColorFormat): HSV | null {
  const value = input.trim();
  if (format === "hex") {
    return hexToHsv(value);
  }

  const numbers = value
    .replace(/[^0-9.,%-]/g, " ")
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((n) => parseFloat(n.replace("%", "")));

  if (numbers.length < 3 || numbers.some((n) => Number.isNaN(n))) return null;

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
    }),
  );
}

export { clamp, round };
