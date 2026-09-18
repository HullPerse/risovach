import { describe, expect, test } from "bun:test";

import {
  formatColor,
  hexToHsv,
  hexToRgb,
  hslToRgb,
  hsvToHex,
  hsvToRgb,
  parseColor,
  rgbToHex,
  rgbToHsl,
  rgbToHsv,
} from "@/lib/color.utils";

describe("primary colors", () => {
  test("hsv red converts to rgb red", () => {
    expect(hsvToRgb({ h: 0, s: 100, v: 100 })).toEqual({
      r: 255,
      g: 0,
      b: 0,
    });
  });

  test("hsv green converts to rgb green", () => {
    expect(hsvToRgb({ h: 120, s: 100, v: 100 })).toEqual({
      r: 0,
      g: 255,
      b: 0,
    });
  });

  test("hsv blue converts to rgb blue", () => {
    expect(hsvToRgb({ h: 240, s: 100, v: 100 })).toEqual({
      r: 0,
      g: 0,
      b: 255,
    });
  });

  test("hue 360 matches hue 0", () => {
    expect(hsvToRgb({ h: 360, s: 100, v: 100 })).toEqual(
      hsvToRgb({ h: 0, s: 100, v: 100 })
    );
  });

  test("zero saturation gives gray", () => {
    expect(hsvToRgb({ h: 0, s: 0, v: 50 })).toEqual({
      r: 128,
      g: 128,
      b: 128,
    });
  });

  test("rgb black converts to zero hsv", () => {
    expect(rgbToHsv({ r: 0, g: 0, b: 0 })).toEqual({ h: 0, s: 0, v: 0 });
  });

  test("rgb red converts to zero-hue hsl", () => {
    expect(rgbToHsl({ r: 255, g: 0, b: 0 })).toEqual({
      h: 0,
      s: 100,
      l: 50,
    });
  });

  test("hsl red converts to rgb red", () => {
    expect(hslToRgb({ h: 0, s: 100, l: 50 })).toEqual({
      r: 255,
      g: 0,
      b: 0,
    });
  });
});

describe("round trips", () => {
  test("hsv survives an rgb round trip", () => {
    const hsv = { h: 200, s: 40, v: 80 };
    const back = rgbToHsv(hsvToRgb(hsv));

    expect(back.h).toBeCloseTo(hsv.h, 0);
    expect(back.s).toBeCloseTo(hsv.s, 0);
    expect(back.v).toBeCloseTo(hsv.v, 0);
  });

  test("hex survives an rgb round trip", () => {
    const rgb = hexToRgb("#1A2B3C");

    if (!rgb) {
      throw new Error("fixture must parse");
    }

    expect(rgbToHex(rgb)).toBe("#1A2B3C");
  });

  test("hsv survives a hex round trip", () => {
    const hsv = { h: 32, s: 75, v: 90 };
    const back = hexToHsv(hsvToHex(hsv));

    if (!back) {
      throw new Error("fixture must parse");
    }

    expect(back.h).toBeCloseTo(hsv.h, 0);
    expect(back.s).toBeCloseTo(hsv.s, 0);
    expect(back.v).toBeCloseTo(hsv.v, 0);
  });
});

describe("hex parsing", () => {
  test("short form expands each channel", () => {
    expect(hexToRgb("#F00")).toEqual({ r: 255, g: 0, b: 0 });
  });

  test("garbage returns null", () => {
    expect(hexToRgb("zzz")).toBeNull();
    expect(hexToHsv("zzz")).toBeNull();
  });
});

describe("parseColor", () => {
  test("rgb numbers convert to hsv", () => {
    expect(parseColor("255, 0, 0", "rgb")).toEqual({
      h: 0,
      s: 100,
      v: 100,
    });
  });

  test("hsl numbers convert to hsv", () => {
    expect(parseColor("0, 100%, 50%", "hsl")).toEqual({
      h: 0,
      s: 100,
      v: 100,
    });
  });

  test("hex input converts to hsv", () => {
    expect(parseColor("#FF0000", "hex")).toEqual({ h: 0, s: 100, v: 100 });
  });

  test("text without numbers returns null", () => {
    expect(parseColor("nope", "rgb")).toBeNull();
  });
});

describe("formatColor", () => {
  test("red formats in every format", () => {
    const hsv = { h: 0, s: 100, v: 100 };

    expect(formatColor(hsv, "hex")).toBe("#FF0000");
    expect(formatColor(hsv, "rgb")).toBe("255, 0, 0");
    expect(formatColor(hsv, "hsl")).toBe("0, 100%, 50%");
  });
});
