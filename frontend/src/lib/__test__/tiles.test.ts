import { describe, expect, test } from "bun:test";

import { tileGrid, tileRect } from "@/lib/tiles.utils";

/** Tile side is a function input here: tile math does not care which. */
const TILE = 256;

describe("tiles", () => {
  test("the document grid rounds up", () => {
    expect(tileGrid({ height: 1080, width: 1920 }, TILE)).toEqual({
      cols: 8,
      rows: 5,
    });
  });

  test("a document smaller than a tile gives one cell", () => {
    expect(tileGrid({ height: 100, width: 100 }, TILE)).toEqual({
      cols: 1,
      rows: 1,
    });
  });

  test("the tile side comes in as a parameter, not a constant", () => {
    expect(tileGrid({ height: 1080, width: 1920 }, 512)).toEqual({
      cols: 4,
      rows: 3,
    });
  });

  test("the tile rectangle uses document coordinates", () => {
    expect(tileRect(19, 8, TILE)).toEqual({
      height: 256,
      width: 256,
      x: 768,
      y: 512,
    });
  });

  test("the first tile sits at the document origin", () => {
    expect(tileRect(0, 8, TILE)).toEqual({
      height: 256,
      width: 256,
      x: 0,
      y: 0,
    });
  });
});
