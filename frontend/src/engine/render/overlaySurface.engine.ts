import {
  CURSOR_GAP,
  MAG_CELL,
  MAG_SIZE,
  MAG_SOURCE,
  MIN_CURSOR_RADIUS,
  PADDING,
} from "@/config/drawing.config";
import { documentRect, documentToScreen } from "@/lib/camera.utils";
import { deviceRect, frameEdges } from "@/lib/pixelGrid.utils";
import type { Point } from "@/types/engine/canvas";
import type {
  Camera,
  OverlayOptions,
  Rect,
  Size,
} from "@/types/engine/drawing";

export const cursorRing = (
  camera: Camera,
  document: Size,
  viewport: Size,
  brushSize: number,
  point: Point
): { radius: number; x: number; y: number } | null => {
  const emptyCheck =
    point.x < 0 ||
    point.y < 0 ||
    point.x > document.width ||
    point.y > document.height;

  if (emptyCheck) return null;

  const screen = documentToScreen(camera, viewport, document, point);

  return {
    radius: Math.max((brushSize / 2) * camera.zoom, MIN_CURSOR_RADIUS),
    x: screen.x,
    y: screen.y,
  };
};

export const magnifierPosition = (
  point: Point,
  viewport: Size
): { x: number; y: number } => ({
  x: Math.max(0, Math.min(viewport.width - MAG_SIZE, point.x + CURSOR_GAP)),
  y: Math.max(0, Math.min(viewport.height - MAG_SIZE, point.y + CURSOR_GAP)),
});

export const magnifierCrop = (
  camera: Camera,
  document: Size,
  viewport: Size,
  point: Point,
  dpr: number
): { size: number; sx: number; sy: number } => {
  const screen = documentToScreen(camera, viewport, document, point);
  const size = MAG_SOURCE * camera.zoom * dpr;

  return {
    size,
    sx: (screen.x - (MAG_SOURCE / 2) * camera.zoom) * dpr,
    sy: (screen.y - (MAG_SOURCE / 2) * camera.zoom) * dpr,
  };
};

const boxAround = (point: Point, radius: number, padding: number): Rect => ({
  height: (radius + padding) * 2,
  width: (radius + padding) * 2,
  x: point.x - radius - padding,
  y: point.y - radius - padding,
});

const boxRect = (position: Point, size: number, padding: number): Rect => ({
  height: size + padding * 2,
  width: size + padding * 2,
  x: position.x - padding,
  y: position.y - padding,
});

const union = (from: Rect | null, to: Rect | null): Rect | null => {
  if (!from) return to;
  if (!to) return from;

  const x = Math.min(from.x, to.x);
  const y = Math.min(from.y, to.y);
  const right = Math.max(from.x + from.width, to.x + to.width);
  const bottom = Math.max(from.y + from.height, to.y + to.height);

  return { height: bottom - y, width: right - x, x, y };
};

/**
 * The overlay holds the sheet frame, the cursor ring and the eyedropper
 * magnifier. The frame belongs here and not on the tile canvas: that canvas
 * is the magnifier source, and a border drawn into it showed up at the very
 * edge of the magnified picture. The plan keeps the frame area apart from the
 * pointer area, so the ring and the magnifier never repaint it, and the
 * magnifier crop of the tile canvas stays frame-free.
 */
export class OverlaySurface {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private dpr = 1;
  private frameRect: Rect | null = null;
  private previous: Rect | null = null;

  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");

    if (!context) throw new Error("Failed to get overlay context");

    this.canvas = canvas;
    this.context = context;
  }

  resize(viewport: Size, dpr: number): void {
    this.canvas.width = Math.max(1, Math.round(viewport.width * dpr));
    this.canvas.height = Math.max(1, Math.round(viewport.height * dpr));
    this.canvas.style.width = `${viewport.width}px`;
    this.canvas.style.height = `${viewport.height}px`;
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.dpr = dpr;
    this.previous = null;
    this.frameRect = null;
  }

  render(options: OverlayOptions): void {
    const { pointer } = options;

    this.renderFrame(options);

    if (pointer === null) return this.clearPrevious();

    this.renderPointer(options, pointer);
  }

  /**
   * The frame is the only overlay content that outlives a cleared plan: the
   * pointer plan clears only its own previous box, and the frame plan clears
   * only its own old rectangle. A camera change repaints the frame area;
   * a pointer change never touches it, so the ring and the magnifier cannot
   * smear it or crop it into the magnifier picture.
   */
  private renderFrame(options: OverlayOptions): void {
    const { camera, document: size, viewport } = options;
    const sheet = deviceRect(documentRect(camera, viewport, size), this.dpr);
    const previous = this.frameRect;

    this.frameRect = sheet;

    if (
      previous &&
      previous.x === sheet.x &&
      previous.y === sheet.y &&
      previous.width === sheet.width &&
      previous.height === sheet.height
    ) {
      return;
    }

    const { context } = this;
    const dirty = union(previous, sheet);

    if (!dirty) return;

    context.clearRect(dirty.x, dirty.y, dirty.width, dirty.height);

    const frame = frameEdges(sheet, this.dpr);

    context.strokeStyle = "rgba(0, 0, 0, 0.45)";
    context.lineWidth = 1 / this.dpr;
    context.beginPath();
    context.moveTo(frame.left, frame.top);
    context.lineTo(frame.right, frame.top);
    context.lineTo(frame.right, frame.bottom);
    context.lineTo(frame.left, frame.bottom);
    context.closePath();
    context.stroke();
  }

  private clearPrevious(): void {
    const { previous } = this;

    this.previous = null;

    if (previous) {
      this.context.clearRect(
        previous.x,
        previous.y,
        previous.width,
        previous.height
      );
    }
  }

  private renderPointer(options: OverlayOptions, pointer: Point): void {
    const { camera, document: size, tool, viewport } = options;
    // the fill has no ring: the region is not a circle, so a ring would lie
    // about what the click is going to pour into
    const ring =
      tool === "fill"
        ? null
        : cursorRing(camera, size, viewport, options.brush.size, pointer);
    const anchor = documentToScreen(camera, viewport, size, pointer);
    const magnifier =
      tool === "eyedropper" ? magnifierPosition(anchor, viewport) : null;
    const current = union(
      ring ? boxAround(ring, ring.radius, PADDING) : null,
      magnifier ? boxRect(magnifier, MAG_SIZE, PADDING + 4) : null
    );
    const dirty = union(current, this.previous);

    this.previous = current;

    if (!dirty) return;

    this.context.clearRect(dirty.x, dirty.y, dirty.width, dirty.height);

    // The clear above wipes any frame line inside the pointer box; the frame
    // plan is independent, so the line comes back only when the camera moves.
    // Redrawing it here keeps the border whole while the pointer moves over it.
    this.redrawFrameInside(dirty);

    if (ring) this.drawRing(ring, options);

    if (magnifier) this.drawMagnifier(magnifier, options);
  }

  /** Restores the frame line inside a cleared pointer area. */
  private redrawFrameInside(dirty: Rect): void {
    const sheet = this.frameRect;

    if (!sheet) return;

    const frame = frameEdges(sheet, this.dpr);

    if (
      frame.right < dirty.x ||
      frame.left > dirty.x + dirty.width ||
      frame.bottom < dirty.y ||
      frame.top > dirty.y + dirty.height
    ) {
      return;
    }

    const { context } = this;

    context.save();
    context.beginPath();
    context.rect(dirty.x, dirty.y, dirty.width, dirty.height);
    context.clip();
    context.strokeStyle = "rgba(0, 0, 0, 0.45)";
    context.lineWidth = 1 / this.dpr;
    context.beginPath();
    context.moveTo(frame.left, frame.top);
    context.lineTo(frame.right, frame.top);
    context.lineTo(frame.right, frame.bottom);
    context.lineTo(frame.left, frame.bottom);
    context.closePath();
    context.stroke();
    context.restore();
  }

  private drawRing(
    ring: { radius: number; x: number; y: number },
    options: OverlayOptions
  ): void {
    const { context } = this;
    const bounds = documentRect(
      options.camera,
      options.viewport,
      options.document
    );

    context.save();

    context.beginPath();
    context.rect(bounds.x, bounds.y, bounds.width, bounds.height);
    context.clip();

    context.beginPath();
    context.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
    context.lineWidth = 3;
    context.strokeStyle = "rgba(0, 0, 0, 0.75)";
    context.stroke();
    context.lineWidth = 1;
    context.strokeStyle = "rgba(255, 255, 255, 0.95)";
    context.stroke();
    context.restore();
  }

  private drawMagnifier(position: Point, options: OverlayOptions): void {
    const { context } = this;
    const { source } = options;

    context.fillStyle = "rgba(0, 0, 0, 0.85)";
    context.fillRect(position.x + 4, position.y + 4, MAG_SIZE, MAG_SIZE);
    context.fillStyle = "#ffffff";
    context.fillRect(position.x, position.y, MAG_SIZE, MAG_SIZE);

    if (source && options.pointer) {
      const crop = magnifierCrop(
        options.camera,
        options.document,
        options.viewport,
        options.pointer,
        this.dpr
      );

      context.imageSmoothingEnabled = false;
      context.drawImage(
        source,
        crop.sx,
        crop.sy,
        crop.size,
        crop.size,
        position.x,
        position.y,
        MAG_SIZE,
        MAG_SIZE
      );
      context.imageSmoothingEnabled = true;
    }

    context.strokeStyle = "rgba(0, 0, 0, 0.15)";
    context.lineWidth = 1;
    context.beginPath();

    for (let index = 1; index < MAG_SOURCE; index += 1) {
      const offset = index * MAG_CELL;

      context.moveTo(position.x + offset, position.y);
      context.lineTo(position.x + offset, position.y + MAG_SIZE);
      context.moveTo(position.x, position.y + offset);
      context.lineTo(position.x + MAG_SIZE, position.y + offset);
    }

    context.stroke();

    if (options.hex) {
      const cell = MAG_CELL;
      const swatchX = position.x + MAG_SIZE - cell - 2;

      context.fillStyle = options.hex;
      context.fillRect(swatchX, position.y + 2, cell, cell);
      context.strokeStyle = "#000000";
      context.lineWidth = 1;
      context.strokeRect(swatchX, position.y + 2, cell, cell);

      context.fillStyle = "rgba(0, 0, 0, 0.75)";
      context.fillRect(position.x, position.y + MAG_SIZE - 14, MAG_SIZE, 14);
      context.fillStyle = "#ffffff";
      context.font = "10px monospace";
      context.fillText(
        options.hex.toUpperCase(),
        position.x + 4,
        position.y + MAG_SIZE - 4
      );
    }

    context.strokeStyle = "rgba(0, 0, 0, 0.9)";
    context.lineWidth = 2;
    context.strokeRect(position.x, position.y, MAG_SIZE, MAG_SIZE);
  }
}
