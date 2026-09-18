import type { CacheEntry } from "@/types/engine/canvas";
import type { TileReader, TileRef } from "@/types/engine/drawing";

const identity = (ref: TileRef): string =>
  `${ref.source}:${ref.layerId}:${ref.key}`;

/** Tile pixels are RGBA, so the buffer length derives from the tile side. */
const bytesPerTile = (tileSize: number): number => tileSize * tileSize * 4;

const createEntry = (tileSize: number): CacheEntry => {
  const canvas = document.createElement("canvas");

  canvas.width = tileSize;
  canvas.height = tileSize;

  const context = canvas.getContext("2d");

  if (!context) throw new Error("Failed to get tile context");

  const pixels = new Uint8Array(bytesPerTile(tileSize));

  return {
    canvas,
    context,
    image: new ImageData(
      new Uint8ClampedArray(
        pixels.buffer,
        pixels.byteOffset,
        pixels.byteLength
      ),
      tileSize,
      tileSize
    ),
    pixels,
    version: -1,
  };
};

/**
 * Tile canvas cache keyed by version: while the version holds, pixels are
 * not copied again. This is the hottest call of a drawing frame.
 *
 * The buffer belongs to the cache, not to the core: pixels arrive in one
 * copy by address in module memory, and `ImageData` looks at that buffer.
 *
 * The tile side comes through the constructor: the cache has no number.
 */
export class TileCanvasCache {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly tileSize: number;

  constructor(tileSize: number) {
    this.tileSize = tileSize;
  }

  get(reader: TileReader, ref: TileRef): HTMLCanvasElement | null {
    const id = identity(ref);
    const existing = this.entries.get(id);

    if (existing && existing.version === ref.version) return existing.canvas;

    const entry = existing ?? createEntry(this.tileSize);

    if (!reader.readTile(ref, entry.pixels)) {
      this.entries.delete(id);

      return null;
    }

    entry.context.putImageData(entry.image, 0, 0);
    entry.version = ref.version;
    this.entries.set(id, entry);

    return entry.canvas;
  }
}
