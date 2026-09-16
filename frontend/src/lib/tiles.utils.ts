import type { Rect, Size, TileGrid, TileKey } from "@/types/drawing";

/**
 * Tile grid and tile rectangles. The tile side comes in as a parameter from
 * the core: the frontend keeps no copy, which would drift and cause seams.
 */
export const tileGrid = (size: Size, tileSize: number): TileGrid => ({
  cols: Math.max(1, Math.ceil(size.width / tileSize)),
  rows: Math.max(1, Math.ceil(size.height / tileSize)),
});

export const tileRect = (
  key: TileKey,
  cols: number,
  tileSize: number
): Rect => {
  const col = key % cols;
  const row = Math.floor(key / cols);

  return {
    height: tileSize,
    width: tileSize,
    x: col * tileSize,
    y: row * tileSize,
  };
};
