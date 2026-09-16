import { documentToScreen } from "@/lib/camera.utils";
import type {
  Camera,
  FrameIndexEntry,
  LayerFrame,
  Rect,
  RenderFrame,
  Size,
  TileDrawItem,
  TileReader,
} from "@/types/drawing";

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

const intersects = (item: TileDrawItem, rect: Rect): boolean =>
  item.x < rect.x + rect.width &&
  item.x + item.size > rect.x &&
  item.y < rect.y + rect.height &&
  item.y + item.size > rect.y;

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
  private readonly scratch: HTMLCanvasElement;
  private readonly scratchContext: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    const scratch = document.createElement("canvas");
    const scratchContext = scratch.getContext("2d");

    if (!(context && scratchContext)) {
      throw new Error("Не удалось получить контекст вывода");
    }

    this.canvas = canvas;
    this.context = context;
    this.scratch = scratch;
    this.scratchContext = scratchContext;
  }

  resize(viewport: Size, dpr: number): boolean {
    const same =
      this.canvas.style.width === `${viewport.width}px` && this.dpr === dpr;

    if (same) {
      return false;
    }

    this.dpr = dpr;
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

    if (!dirty) {
      return null;
    }

    const { context } = this;
    const smoothing = frame.camera.zoom < 1;
    const documentRect = documentScreenRect(frame);

    context.save();
    context.beginPath();
    context.rect(dirty.x, dirty.y, dirty.width, dirty.height);
    context.clip();
    context.clearRect(dirty.x, dirty.y, dirty.width, dirty.height);
    context.fillStyle = "#ffffff";
    context.fillRect(
      documentRect.x,
      documentRect.y,
      documentRect.width,
      documentRect.height
    );
    context.imageSmoothingEnabled = smoothing;

    for (const group of frame.groups) {
      if (frame.overlay && group.layerId === frame.overlay.layerId) {
        this.renderGroupWithOverlay(frame, reader, group, dirty, smoothing);
        continue;
      }

      this.renderItems(reader, context, group.items, dirty, group.opacity, smoothing);
    }

    context.strokeStyle = "rgba(0, 0, 0, 0.45)";
    context.lineWidth = 1;
    context.strokeRect(
      documentRect.x + 0.5,
      documentRect.y + 0.5,
      Math.max(0, documentRect.width - 1),
      Math.max(0, documentRect.height - 1)
    );
    context.restore();

    return dirty;
  }

  private renderItems(
    reader: TileReader,
    context: CanvasRenderingContext2D,
    items: TileDrawItem[],
    dirty: Rect,
    opacity: number,
    smoothing: boolean
  ): void {
    if (opacity <= 0) {
      return;
    }

    context.imageSmoothingEnabled = smoothing;
    context.globalAlpha = opacity;

    for (const item of items) {
      if (!intersects(item, dirty)) {
        continue;
      }

      const canvas = this.cacheFor(reader).get(reader, item);

      if (!canvas) {
        continue;
      }

      context.drawImage(canvas, item.x, item.y, item.size, item.size);
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

    if (!overlay) {
      return;
    }

    const { scratchContext: scratch } = this;

    scratch.save();
    scratch.beginPath();
    scratch.rect(dirty.x, dirty.y, dirty.width, dirty.height);
    scratch.clip();
    scratch.clearRect(dirty.x, dirty.y, dirty.width, dirty.height);
    this.renderItems(reader, scratch, group.items, dirty, group.opacity, smoothing);

    scratch.globalCompositeOperation =
      overlay.mode === "destination-out" ? "destination-out" : "source-over";
    this.renderItems(reader, scratch, overlay.items, dirty, overlay.opacity, smoothing);
    scratch.globalCompositeOperation = "source-over";
    scratch.restore();

    this.context.drawImage(
      this.scratch,
      dirty.x,
      dirty.y,
      dirty.width,
      dirty.height,
      dirty.x,
      dirty.y,
      dirty.width,
      dirty.height
    );
  }
}
