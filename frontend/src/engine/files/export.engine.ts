import { tileGrid, tileRect } from "@/lib/tiles.utils";
import type { DrawingCore, Size } from "@/types/drawing";

import { TileCanvasCache } from "@/engine/render/tileCache.engine";

const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob | null> =>
  // toBlob reports through a callback only; HTMLCanvasElement has no other
  // way to await the file
  // oxlint-disable-next-line promise/avoid-new
  new Promise((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });

/**
 * Builds a file from core tiles. Tiles are taken for the whole document and
 * not for the visible area, so the drawing is saved as a whole.
 */
export const exportDocument = async ({
  core,
  filename,
}: {
  core: DrawingCore;
  filename: string;
}): Promise<File | null> => {
  const size: Size = core.size;
  const canvas = document.createElement("canvas");

  canvas.width = size.width;
  canvas.height = size.height;

  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, size.width, size.height);

  const { cols } = tileGrid(size, core.tileSize);
  const cache = new TileCanvasCache(core.tileSize);

  for (const layer of core.layers) {
    if (!layer.visible) {
      continue;
    }

    context.globalAlpha = layer.opacity;

    for (const ref of core.layerTiles(layer.id)) {
      const source = cache.get(core, ref);

      if (!source) {
        continue;
      }

      const rect = tileRect(ref.key, cols, core.tileSize);

      context.drawImage(source, rect.x, rect.y);
    }

    context.globalAlpha = 1;
  }

  const blob = await canvasToBlob(canvas);

  return blob ? new File([blob], filename, { type: "image/png" }) : null;
};
