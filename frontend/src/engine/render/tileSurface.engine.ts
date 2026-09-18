import { documentToScreen } from "@/lib/camera.utils";
import { deviceRect, snapToPixel } from "@/lib/pixelGrid.utils";
import type { Point } from "@/types/engine/canvas";
import type {
  Camera,
  FrameIndexEntry,
  LayerFrame,
  Rect,
  RenderFrame,
  Size,
  TileDrawItem,
  TileKey,
  TileReader,
} from "@/types/engine/drawing";

import { diffFrames, indexFrame } from "./compositor.engine";
import { TileCanvasCache } from "./tileCache.engine";

export const documentScreenRect = ({
  camera,
  document: size,
  viewport,
}: {
  camera: Camera;
  document: Size;
  viewport: Size;
}): Rect => {
  const origin = documentToScreen(camera, viewport, size, { x: 0, y: 0 });

  return {
    height: size.height * camera.zoom,
    width: size.width * camera.zoom,
    x: origin.x,
    y: origin.y,
  };
};

const intersects = (box: Rect, rect: Rect): boolean =>
  box.x < rect.x + rect.width &&
  box.x + box.width > rect.x &&
  box.y < rect.y + rect.height &&
  box.y + box.height > rect.y;

/**
 * Where a tile lands on screen, with its edges snapped to the device pixel
 * grid. Both edges come from the tile's own boundaries, so a neighbour
 * computes the same value for the boundary they share and the two rectangles
 * meet on one pixel instead of leaving a sliver of the sheet between them.
 */
export const tileScreenBox = (
  key: TileKey,
  camera: Camera,
  viewport: Size,
  document: Size,
  tileSize: number,
  dpr: number
): Rect => {
  const cols = Math.max(1, Math.ceil(document.width / tileSize));
  const col = key % cols;
  const row = Math.floor(key / cols);
  const screen = (x: number, y: number): Point =>
    documentToScreen(camera, viewport, document, { x, y });
  const from = screen(col * tileSize, row * tileSize);
  const to = screen((col + 1) * tileSize, (row + 1) * tileSize);
  const x = snapToPixel(from.x, dpr);
  const y = snapToPixel(from.y, dpr);

  return {
    height: snapToPixel(to.y, dpr) - y,
    width: snapToPixel(to.x, dpr) - x,
    x,
    y,
  };
};

const frameKey = (frame: RenderFrame): string =>
  [
    frame.camera.x,
    frame.camera.y,
    frame.camera.zoom,
    frame.viewport.width,
    frame.viewport.height,
    frame.document.width,
    frame.document.height,
  ].join(":");

export class TileSurface {
  private cache: TileCanvasCache | null = null;
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private dpr = 1;
  private previous: Map<string, FrameIndexEntry> | null = null;
  private previousKey = "";
  private reader: TileReader | null = null;
  private viewport: Size = { height: 0, width: 0 };
  private readonly scratch: HTMLCanvasElement;
  private readonly scratchContext: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    const scratch = document.createElement("canvas");
    const scratchContext = scratch.getContext("2d");

    if (!context || !scratchContext) {
      throw new Error("Failed to get output context");
    }

    this.canvas = canvas;
    this.context = context;
    this.scratch = scratch;
    this.scratchContext = scratchContext;
  }

  resize(viewport: Size, dpr: number): boolean {
    // Both axes matter: a height-only change used to slip through, and then
    // the camera viewport and the canvas backing store drifted apart.
    const same =
      this.viewport.width === viewport.width &&
      this.viewport.height === viewport.height &&
      this.dpr === dpr;

    if (same) return false;

    this.dpr = dpr;
    this.viewport = viewport;
    this.previousKey = "";

    for (const canvas of [this.canvas, this.scratch]) {
      canvas.width = Math.max(1, Math.round(viewport.width * dpr));
      canvas.height = Math.max(1, Math.round(viewport.height * dpr));
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
    }

    for (const context of [this.context, this.scratchContext]) {
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    return true;
  }

  snapshot(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * The tile cache is created on the first frame: the tile side is known
   * only from the core, and the core arrives together with the reader.
   */
  private cacheFor(reader: TileReader): TileCanvasCache {
    this.cache ??= new TileCanvasCache(reader.tileSize);

    return this.cache;
  }

  /**
   * Draws a frame on demand. Returns the repaint area, or null when nothing
   * changed and the canvas needs no writes.
   */
  render(frame: RenderFrame, reader: TileReader): Rect | null {
    // A new reader is a new document, and its tiles may carry the versions of
    // the previous one: the cached pixels would win and the old picture stay.
    // So the cache and the frame index belong to the reader.
    if (this.reader !== reader) {
      this.reader = reader;
      this.cache = null;
      this.previous = null;
      this.previousKey = "";
    }

    const key = frameKey(frame);
    const index = indexFrame(frame);
    const dirty = diffFrames(
      this.previous,
      index,
      frame.viewport,
      key !== this.previousKey
    );

    this.previous = index;
    this.previousKey = key;

    if (!dirty) return null;

    const { context } = this;
    const smoothing = frame.camera.zoom < 1;
    // Only the sheet lives here. The frame around it went to the overlay:
    // this canvas is the eyedropper magnifier source, and a border line drawn
    // into it showed up at the very edge of the magnified picture.
    const sheet = deviceRect(documentScreenRect(frame), this.dpr);

    context.save();
    context.beginPath();
    context.rect(dirty.x, dirty.y, dirty.width, dirty.height);
    context.clip();
    context.clearRect(dirty.x, dirty.y, dirty.width, dirty.height);
    context.fillStyle = "#ffffff";
    context.fillRect(sheet.x, sheet.y, sheet.width, sheet.height);
    context.imageSmoothingEnabled = smoothing;

    for (const group of frame.groups) {
      if (frame.overlay && group.layerId === frame.overlay.layerId) {
        this.renderGroupWithOverlay(frame, reader, group, dirty, smoothing);
        continue;
      }

      this.renderItems(
        frame,
        reader,
        context,
        group.items,
        dirty,
        group.opacity,
        smoothing
      );
    }

    context.restore();

    return dirty;
  }

  private renderItems(
    frame: RenderFrame,
    reader: TileReader,
    context: CanvasRenderingContext2D,
    items: TileDrawItem[],
    dirty: Rect,
    opacity: number,
    smoothing: boolean
  ): void {
    if (opacity <= 0) return;

    context.imageSmoothingEnabled = smoothing;
    context.globalAlpha = opacity;

    for (const item of items) {
      const box = tileScreenBox(
        item.key,
        frame.camera,
        frame.viewport,
        frame.document,
        reader.tileSize,
        this.dpr
      );

      if (!intersects(box, dirty)) continue;

      const canvas = this.cacheFor(reader).get(reader, item);

      if (!canvas) continue;

      context.drawImage(canvas, box.x, box.y, box.width, box.height);
    }

    context.globalAlpha = 1;
  }

  /**
   * A layer under the stroke is drawn on the scratch canvas, where the stroke
   * buffer is applied over it. Otherwise the eraser would clear the document
   * background instead of its own layer.
   */
  private renderGroupWithOverlay(
    frame: RenderFrame,
    reader: TileReader,
    group: LayerFrame,
    dirty: Rect,
    smoothing: boolean
  ): void {
    const { overlay } = frame;

    if (!overlay) return;

    const { scratchContext: scratch } = this;

    scratch.save();
    scratch.beginPath();
    scratch.rect(dirty.x, dirty.y, dirty.width, dirty.height);
    scratch.clip();
    scratch.clearRect(dirty.x, dirty.y, dirty.width, dirty.height);
    this.renderItems(
      frame,
      reader,
      scratch,
      group.items,
      dirty,
      group.opacity,
      smoothing
    );

    scratch.globalCompositeOperation =
      overlay.mode === "destination-out" ? "destination-out" : "source-over";
    this.renderItems(
      frame,
      reader,
      scratch,
      overlay.items,
      dirty,
      overlay.opacity,
      smoothing
    );
    scratch.globalCompositeOperation = "source-over";
    scratch.restore();

    // The scratch is read in its own device pixels, the output takes CSS ones.
    const scale = this.dpr;

    this.context.drawImage(
      this.scratch,
      dirty.x * scale,
      dirty.y * scale,
      dirty.width * scale,
      dirty.height * scale,
      dirty.x,
      dirty.y,
      dirty.width,
      dirty.height
    );
  }
}
