import { documentToScreen, screenToDocument } from "@/lib/camera.utils";
import { tileGrid, tileRect } from "@/lib/tiles.utils";
import type {
  Camera,
  FrameIndexEntry,
  LayerFrame,
  Rect,
  RenderFrame,
  Size,
  TileDrawItem,
  TileRef,
  TileRefSource,
} from "@/types/engine/drawing";

export const visibleDocumentRect = (
  camera: Camera,
  viewport: Size,
  document: Size
): Rect => {
  const from = screenToDocument(camera, viewport, document, { x: 0, y: 0 });
  const to = screenToDocument(camera, viewport, document, {
    x: viewport.width,
    y: viewport.height,
  });

  return {
    height: to.y - from.y,
    width: to.x - from.x,
    x: from.x,
    y: from.y,
  };
};

const makeItems = (
  refs: TileRef[],
  camera: Camera,
  viewport: Size,
  document: Size,
  cols: number,
  tileSize: number
): TileDrawItem[] => {
  const items: TileDrawItem[] = [];

  for (const ref of refs) {
    const rect = tileRect(ref.key, cols, tileSize);
    const screen = documentToScreen(camera, viewport, document, {
      x: rect.x,
      y: rect.y,
    });

    items.push({
      ...ref,
      size: tileSize * camera.zoom,
      x: screen.x,
      y: screen.y,
    });
  }

  return items;
};

/**
 * Builds a frame from tile references. No pixels here: the output pulls them
 * by reference, and only for tiles whose version left the cache.
 */
export const renderFrame = ({
  camera,
  source,
  tileSize,
  viewport,
}: {
  camera: Camera;
  source: TileRefSource;
  /** Tile side comes from the core: frame building has no number of its own. */
  tileSize: number;
  viewport: Size;
}): RenderFrame => {
  const document = source.size;
  const rect = visibleDocumentRect(camera, viewport, document);
  const { cols } = tileGrid(document, tileSize);
  const groups: LayerFrame[] = [];

  for (const layer of source.layers) {
    if (!layer.visible) continue;

    groups.push({
      items: makeItems(
        source.layerTiles(layer.id, rect),
        camera,
        viewport,
        document,
        cols,
        tileSize
      ),
      layerId: layer.id,
      mode: "source-over",
      opacity: layer.opacity,
    });
  }

  const { overlay } = source;
  const overlayFrame =
    overlay && overlay.layerId === source.activeLayerId
      ? {
          items: makeItems(
            source.overlayTiles(rect),
            camera,
            viewport,
            document,
            cols,
            tileSize
          ),
          layerId: overlay.layerId,
          mode: overlay.mode,
          opacity: overlay.opacity,
        }
      : null;

  return { camera, document, groups, overlay: overlayFrame, viewport };
};

export const indexFrame = (
  frame: RenderFrame
): Map<string, FrameIndexEntry> => {
  const index = new Map<string, FrameIndexEntry>();

  const add = (prefix: string, items: TileDrawItem[]) => {
    for (const item of items) {
      index.set(`${prefix}:${item.key}`, {
        size: item.size,
        version: item.version,
        x: item.x,
        y: item.y,
      });
    }
  };

  for (const group of frame.groups) add(String(group.layerId), group.items);

  if (frame.overlay) add("overlay", frame.overlay.items);

  return index;
};

const unionRect = (
  bounds: Rect | null,
  item: FrameIndexEntry,
  padding: number
): Rect => {
  const box: Rect = {
    height: item.size + padding * 2,
    width: item.size + padding * 2,
    x: item.x - padding,
    y: item.y - padding,
  };

  if (!bounds) return box;

  const right = Math.max(bounds.x + bounds.width, box.x + box.width);
  const bottom = Math.max(bounds.y + bounds.height, box.y + box.height);

  return {
    height: bottom - Math.min(bounds.y, box.y),
    width: right - Math.min(bounds.x, box.x),
    x: Math.min(bounds.x, box.x),
    y: Math.min(bounds.y, box.y),
  };
};

/**
 * Repaint area: union of tiles that changed, appeared or disappeared.
 * An unchanged frame gives null, and then the canvas gets no writes at all.
 */
export const diffFrames = (
  previous: Map<string, FrameIndexEntry> | null,
  next: Map<string, FrameIndexEntry>,
  viewport: Size,
  forceFull: boolean
): Rect | null => {
  if (!previous || forceFull) {
    return { height: viewport.height, width: viewport.width, x: 0, y: 0 };
  }

  const padding = 1;
  let bounds: Rect | null = null;

  for (const [key, item] of next) {
    const before = previous.get(key);

    if (!before || before.version !== item.version) {
      bounds = unionRect(bounds, item, padding);
    }
  }

  for (const [key, item] of previous) {
    if (!next.has(key)) {
      bounds = unionRect(bounds, item, padding);
    }
  }

  if (!bounds) return null;

  const x = Math.max(0, Math.floor(bounds.x));
  const y = Math.max(0, Math.floor(bounds.y));
  const right = Math.min(viewport.width, Math.ceil(bounds.x + bounds.width));
  const bottom = Math.min(viewport.height, Math.ceil(bounds.y + bounds.height));

  if (right <= x || bottom <= y) return null;
  return { height: bottom - y, width: right - x, x, y };
};
