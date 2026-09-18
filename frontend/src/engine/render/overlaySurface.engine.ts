import {
  CURSOR_GAP,
  MAG_CELL,
  MAG_CELL_MIN,
  MAG_EYE_HEIGHT,
  MAG_LABEL_GAP,
  MAG_LABEL_HEIGHT,
  MAG_RETICLE_ARM,
  MAG_SIZE,
  MAG_SOURCE,
  MIN_CURSOR_RADIUS,
  MINIMAP_HOVER_ALPHA,
  OVERLAY_SHADOW,
  PADDING,
} from "@/config/drawing.config";
import {
  documentRect,
  documentToScreen,
  screenRectToDocument,
} from "@/lib/camera.utils";
import {
  minimapLayout,
  minimapWindow,
} from "@/lib/minimap.utils";
import { deviceRect, frameEdges } from "@/lib/pixelGrid.utils";
import type { Point } from "@/types/engine/canvas";
import type {
  Camera,
  EyeCurve,
  MinimapLayout,
  OverlayOptions,
  PixelReticle,
  Rect,
  Size,
} from "@/types/engine/drawing";

import { drawnPixelRect } from "./tileSurface.engine";

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

// Full painted size: eye, shadow, gap and hex plate, plus clear padding.
export const magnifierExtent = (): Size => {
  const pad = PADDING + 4;

  return {
    height:
      MAG_EYE_HEIGHT +
      OVERLAY_SHADOW +
      MAG_LABEL_GAP +
      MAG_LABEL_HEIGHT +
      pad * 2,
    width: MAG_SIZE + OVERLAY_SHADOW + pad * 2,
  };
};

const boxAround = (point: Point, radius: number, padding: number): Rect => ({
  height: (radius + padding) * 2,
  width: (radius + padding) * 2,
  x: point.x - radius - padding,
  y: point.y - radius - padding,
});

/** The rectangle grown on every side by the clear padding. */
const padded = (rect: Rect, padding: number): Rect => ({
  height: rect.height + padding * 2,
  width: rect.width + padding * 2,
  x: rect.x - padding,
  y: rect.y - padding,
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

const intersection = (from: Rect, to: Rect): Rect | null => {
  const x = Math.max(from.x, to.x);
  const y = Math.max(from.y, to.y);
  const right = Math.min(from.x + from.width, to.x + to.width);
  const bottom = Math.min(from.y + from.height, to.y + to.height);

  if (right <= x || bottom <= y) return null;

  return { height: bottom - y, width: right - x, x, y };
};

/**
 * Panel plus its hard shadow. A repaint clears and redraws this whole box:
 * clearing the panel alone would leave the shadow strip outside it, and
 * repainting a translucent shadow over its own leftovers darkens them.
 */
const shadowBox = (panel: Rect): Rect => ({
  height: panel.height + OVERLAY_SHADOW,
  width: panel.width + OVERLAY_SHADOW,
  x: panel.x,
  y: panel.y,
});

const sameRect = (from: Rect, to: Rect): boolean =>
  from.x === to.x &&
  from.y === to.y &&
  from.width === to.width &&
  from.height === to.height;

/** The loupe's clear box: the whole loupe plus its padding. */
export const magnifierBox = (position: Point): Rect => {
  const extent = magnifierExtent();
  const pad = PADDING + 4;

  return {
    height: extent.height,
    width: extent.width,
    x: position.x - pad,
    y: position.y - pad,
  };
};

/**
 * Sides of the pointer the loupe fits on, in preference order: the far side
 * first, then the near one. A side that does not fit is dropped, not clamped:
 * the flip beats the clamp, and a clamped loupe would cover the pointer and
 * the pixel the reticle points at.
 */
const loupeSides = (from: number, size: number, limit: number): number[] => {
  const after = from + CURSOR_GAP;
  const before = from - CURSOR_GAP - size;
  const sides: number[] = [];

  if (after + size <= limit) sides.push(Math.max(0, after));
  if (before >= 0) sides.push(before);

  // Neither side fits: the loupe is clamped into the viewport, which is all
  // that is left when the viewport is smaller than the loupe.
  if (sides.length === 0) {
    sides.push(Math.max(0, Math.min(limit - size, Math.max(0, after))));
  }

  return sides;
};

/**
 * Where the loupe goes. `avoid` is the minimap panel: the panel is drawn on
 * top of the overlay, so a loupe under it would be invisible exactly when the
 * pointer is near the corner of the sheet.
 */
export const magnifierPosition = (
  point: Point,
  viewport: Size,
  avoid: Rect | null = null
): { x: number; y: number } => {
  const extent = magnifierExtent();
  const xs = loupeSides(point.x, extent.width, viewport.width);
  const ys = loupeSides(point.y, extent.height, viewport.height);
  const candidates: Point[] = [];

  // Vertical runs slowest, so a horizontal flip is tried before a vertical
  // one: the loupe normally sits to the right of the pointer, and the panel
  // it has to avoid lives in the right corner.
  for (const y of ys) {
    for (const x of xs) {
      candidates.push({ x, y });
    }
  }

  for (const candidate of candidates) {
    if (!avoid || intersection(magnifierBox(candidate), avoid) === null) {
      return candidate;
    }
  }

  return candidates[0];
};

export const eyeCurve = (position: Point): EyeCurve => {
  const midY = position.y + MAG_EYE_HEIGHT / 2;

  return {
    bottomControl: {
      x: position.x + MAG_SIZE / 2,
      y: position.y + MAG_EYE_HEIGHT * 1.5,
    },
    left: { x: position.x, y: midY },
    right: { x: position.x + MAG_SIZE, y: midY },
    topControl: {
      x: position.x + MAG_SIZE / 2,
      y: position.y - MAG_EYE_HEIGHT / 2,
    },
  };
};

/**
 * A cell smaller than `min` grows around its centre. The drawn pixel can be
 * thinner than a device pixel at low zoom, and then the marks would collapse
 * into a dot nobody can aim with.
 */
const atLeast = (rect: Rect, min: number): Rect => {
  const width = Math.max(rect.width, min);
  const height = Math.max(rect.height, min);

  return {
    height,
    width,
    x: rect.x + (rect.width - width) / 2,
    y: rect.y + (rect.height - height) / 2,
  };
};

/**
 * Corner marks around the sampled document pixel. Arms run inwards along the
 * cell edges, so the marks never cover a neighbouring pixel.
 */
export const pixelReticle = (drawn: Rect): PixelReticle => {
  const cell = atLeast(drawn, MAG_CELL_MIN);
  const right = cell.x + cell.width;
  const bottom = cell.y + cell.height;
  const arm = MAG_RETICLE_ARM;

  return {
    cell,
    segments: [
      { x1: cell.x, x2: cell.x + arm, y1: cell.y, y2: cell.y },
      { x1: cell.x, x2: cell.x, y1: cell.y, y2: cell.y + arm },
      { x1: cell.x, x2: cell.x + arm, y1: bottom, y2: bottom },
      { x1: cell.x, x2: cell.x, y1: bottom, y2: bottom - arm },
      { x1: right, x2: right - arm, y1: cell.y, y2: cell.y },
      { x1: right, x2: right, y1: cell.y, y2: cell.y + arm },
      { x1: right, x2: right - arm, y1: bottom, y2: bottom },
      { x1: right, x2: right, y1: bottom, y2: bottom - arm },
    ],
  };
};

/**
 * Source rectangle of the loupe: a whole number of pixels around the sampled
 * one, so the magnified image of that pixel covers exactly the pupil cell.
 *
 * The window is centred on the sampled pixel, not on the pointer. With an odd
 * source count a pointer-centred window puts the pixel on a cell boundary, and
 * the loupe then shows a neighbour of the colour it picks.
 */
export const magnifierCrop = (
  cell: Rect,
  dpr: number
): { size: number; sx: number; sy: number } => {
  // half a source pixel less than the window half, so the pixel itself sits in
  // the middle cell of the odd-sized window
  const half = MAG_SOURCE / 2 - 0.5;

  return {
    size: MAG_SOURCE * cell.width * dpr,
    sx: (cell.x - half * cell.width) * dpr,
    sy: (cell.y - half * cell.height) * dpr,
  };
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
  private minimapContent = 0;
  private minimapKey = "";
  private minimapPanel: Rect | null = null;
  private previous: Rect | null = null;
  private thumb: HTMLCanvasElement | null = null;
  private thumbContext: CanvasRenderingContext2D | null = null;

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
    const frameArea = this.renderFrame(options);
    const pointerArea =
      pointer === null ? this.clearPrevious() : this.renderPointer(options, pointer);

    // Each plan reports what it wiped, so the plan drawn last can restore
    // itself: the minimap sits on top of the sheet frame and the pointer.
    this.renderMinimap(options, [frameArea, pointerArea]);
  }

  /**
   * The frame is the only overlay content that outlives a cleared plan: the
   * pointer plan clears only its own previous box, and the frame plan clears
   * only its own old rectangle. A camera change repaints the frame area;
   * a pointer change never touches it, so the ring and the magnifier cannot
   * smear it or crop it into the magnifier picture.
   */
  private renderFrame(options: OverlayOptions): Rect | null {
    const { camera, document: size, viewport } = options;
    const sheet = deviceRect(documentRect(camera, viewport, size), this.dpr);
    const previous = this.frameRect;

    this.frameRect = sheet;

    if (previous && sameRect(previous, sheet)) {
      return null;
    }

    const { context } = this;
    const dirty = union(previous, sheet);

    if (!dirty) return null;

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

    return dirty;
  }

  private clearPrevious(): Rect | null {
    const { previous } = this;

    this.previous = null;

    if (!previous) return null;

    this.context.clearRect(
      previous.x,
      previous.y,
      previous.width,
      previous.height
    );

    return previous;
  }

  private renderPointer(options: OverlayOptions, pointer: Point): Rect | null {
    const { camera, document: size, tool, viewport } = options;
    // the fill has no ring: the region is not a circle, so a ring would lie
    // about what the click is going to pour into. the eyedropper has no ring
    // either: brush size is noise while aiming, the loupe and the aim mark
    // carry the meaning instead
    const ring =
      tool === "fill" || tool === "eyedropper"
        ? null
        : cursorRing(camera, size, viewport, options.brush.size, pointer);
    // the core floors the pointer the same way, so the reticle, the loupe and
    // the picked colour all speak about one pixel
    const sampled = { x: Math.floor(pointer.x), y: Math.floor(pointer.y) };
    // one rectangle for the reticle and for the loupe: both mark the pixel the
    // core is about to sample, and computing it twice invites a drift
    const drawn =
      tool === "eyedropper"
        ? drawnPixelRect(camera, viewport, size, sampled, options.tileSize, this.dpr)
        : null;
    const reticle = drawn === null ? null : pixelReticle(drawn);
    const magnifier =
      drawn === null
        ? null
        : magnifierPosition(
            documentToScreen(camera, viewport, size, pointer),
            viewport,
            minimapLayout(size, viewport).panel
          );
    const current = union(
      union(
        ring ? boxAround(ring, ring.radius, PADDING) : null,
        magnifier ? magnifierBox(magnifier) : null
      ),
      reticle ? padded(reticle.cell, PADDING + 2) : null
    );
    const dirty = union(current, this.previous);

    this.previous = current;

    if (!dirty) return null;

    this.context.clearRect(dirty.x, dirty.y, dirty.width, dirty.height);

    // The clear above wipes any frame line inside the pointer box; the frame
    // plan is independent, so the line comes back only when the camera moves.
    // Redrawing it here keeps the border whole while the pointer moves over it.
    this.redrawFrameInside(dirty);

    if (ring) this.drawRing(ring, options);

    if (magnifier && drawn) this.drawMagnifier(magnifier, options, drawn);

    // The reticle goes last: in a viewport too small for either side of the
    // pointer the loupe still sits over it, and the marks must stay visible.
    if (reticle) this.drawReticle(reticle);

    return dirty;
  }

  /**
   * Minimap: a thumbnail of the document, the window rectangle and the drag
   * handle. The thumbnail is not read from the document again: the part the
   * tile surface repainted this frame is copied out of the source canvas, so
   * the panel follows the drawing for one small `drawImage` per frame.
   *
   * Repainted only when something it shows changed or another plan wiped it.
   */
  private renderMinimap(options: OverlayOptions, erased: (Rect | null)[]): void {
    const layout = minimapLayout(options.document, options.viewport);
    const box = shadowBox(layout.panel);
    const previous = this.minimapPanel;

    this.minimapPanel = box;
    // The surface has to exist before the copy: a thumbnail created after it
    // would miss the very first frame the tile surface painted.
    this.ensureThumbnail(layout);
    this.refreshThumbnail(layout, options);

    const key = [
      box.x,
      box.y,
      box.width,
      box.height,
      options.camera.x,
      options.camera.y,
      options.camera.zoom,
      options.minimapHover ? 1 : 0,
      this.minimapContent,
    ].join(":");
    const covered = erased.some(
      (rect) => rect !== null && intersection(rect, box) !== null
    );

    if (key === this.minimapKey && !covered && previous && sameRect(previous, box)) {
      return;
    }

    this.minimapKey = key;

    if (previous && !sameRect(previous, box)) {
      this.context.clearRect(
        previous.x,
        previous.y,
        previous.width,
        previous.height
      );
      this.redrawFrameInside(previous);
    }

    this.drawMinimap(layout, options, box);
  }

  /**
   * Brings the source pixels of the freshly painted area into the thumbnail.
   * The whole visible part of the sheet is copied on a pan or a zoom, because
   * then the tile surface repaints the whole viewport.
   */
  private refreshThumbnail(layout: MinimapLayout, options: OverlayOptions): void {
    const { camera, document: size, source, viewport } = options;

    if (this.thumb === null || this.thumbContext === null) return;
    if (!source || !options.dirty) return;

    const area = intersection(options.dirty, documentRect(camera, viewport, size));

    if (!area) return;

    const scale = layout.scale * this.dpr;
    const painter = screenRectToDocument(camera, viewport, size, area);

    this.thumbContext.imageSmoothingEnabled = true;
    this.thumbContext.drawImage(
      source,
      area.x * this.dpr,
      area.y * this.dpr,
      area.width * this.dpr,
      area.height * this.dpr,
      painter.x * scale,
      painter.y * scale,
      painter.width * scale,
      painter.height * scale
    );
    this.minimapContent += 1;
  }

  /** Thumbnail canvas, recreated when the layout or the device ratio changes. */
  private ensureThumbnail(layout: MinimapLayout): void {
    const width = Math.max(1, Math.round(layout.image.width * this.dpr));
    const height = Math.max(1, Math.round(layout.image.height * this.dpr));
    // The second read is safe: a matching width already says the thumbnail exists.
    const fits = this.thumb?.width === width && this.thumb.height === height;

    if (fits) {
      return;
    }

    const thumb = document.createElement("canvas");

    thumb.width = width;
    thumb.height = height;
    this.thumb = thumb;
    this.thumbContext = thumb.getContext("2d");
    // A new surface is empty: nothing may be copied into it twice, and the
    // panel has to be repainted from scratch.
    this.minimapContent += 1;
  }

  private drawMinimap(layout: MinimapLayout, options: OverlayOptions, box: Rect): void {
    const { context } = this;
    const { panel, image } = layout;

    context.clearRect(box.x, box.y, box.width, box.height);
    context.save();
    context.globalAlpha = options.minimapHover ? MINIMAP_HOVER_ALPHA : 1;

    context.fillStyle = "rgba(0, 0, 0, 0.35)";
    context.fillRect(
      panel.x + OVERLAY_SHADOW,
      panel.y + OVERLAY_SHADOW,
      panel.width,
      panel.height
    );
    context.fillStyle = "#ffffff";
    context.fillRect(panel.x, panel.y, panel.width, panel.height);

    if (this.thumb) {
      context.drawImage(this.thumb, image.x, image.y, image.width, image.height);
    }

    context.strokeStyle = "rgba(0, 0, 0, 0.45)";
    context.lineWidth = 1;
    context.strokeRect(image.x, image.y, image.width, image.height);

    // The window outline speaks about the camera, so it is clipped to the
    // sheet: panned off screen it would otherwise hang over the whole panel.
    context.save();
    context.beginPath();
    context.rect(image.x, image.y, image.width, image.height);
    context.clip();

    const view = minimapWindow(
      options.camera,
      options.viewport,
      options.document,
      layout
    );

    context.lineWidth = 3;
    context.strokeStyle = "rgba(0, 0, 0, 0.75)";
    context.strokeRect(view.x, view.y, view.width, view.height);
    context.lineWidth = 1;
    context.strokeStyle = "rgba(255, 255, 255, 0.95)";
    context.strokeRect(view.x, view.y, view.width, view.height);
    context.restore();

    context.restore();
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

  private drawReticle(reticle: PixelReticle): void {
    const { context } = this;

    context.beginPath();

    for (const segment of reticle.segments) {
      context.moveTo(segment.x1, segment.y1);
      context.lineTo(segment.x2, segment.y2);
    }

    context.lineWidth = 3;
    context.strokeStyle = "rgba(0, 0, 0, 0.75)";
    context.stroke();
    context.lineWidth = 1;
    context.strokeStyle = "rgba(255, 255, 255, 0.95)";
    context.stroke();
  }

  private drawMagnifier(
    position: Point,
    options: OverlayOptions,
    drawn: Rect
  ): void {
    const { context } = this;
    const { source } = options;
    const curve = eyeCurve(position);
    // the square loupe is painted first, the eye is a window to its middle
    const squareY = position.y - (MAG_SIZE - MAG_EYE_HEIGHT) / 2;

    const traceEye = (shiftX: number, shiftY: number): void => {
      context.beginPath();
      context.moveTo(curve.left.x + shiftX, curve.left.y + shiftY);
      context.quadraticCurveTo(
        curve.topControl.x + shiftX,
        curve.topControl.y + shiftY,
        curve.right.x + shiftX,
        curve.right.y + shiftY
      );
      context.quadraticCurveTo(
        curve.bottomControl.x + shiftX,
        curve.bottomControl.y + shiftY,
        curve.left.x + shiftX,
        curve.left.y + shiftY
      );
      context.closePath();
    };

    context.fillStyle = "rgba(0, 0, 0, 0.85)";
    traceEye(OVERLAY_SHADOW, OVERLAY_SHADOW);
    context.fill();

    context.save();
    traceEye(0, 0);
    context.clip();
    context.fillStyle = "#ffffff";
    context.fillRect(position.x, position.y, MAG_SIZE, MAG_EYE_HEIGHT);

    if (source) {
      const crop = magnifierCrop(drawn, this.dpr);

      context.imageSmoothingEnabled = false;
      context.drawImage(
        source,
        crop.sx,
        crop.sy,
        crop.size,
        crop.size,
        position.x,
        squareY,
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

      context.moveTo(position.x + offset, squareY);
      context.lineTo(position.x + offset, squareY + MAG_SIZE);
      context.moveTo(position.x, squareY + offset);
      context.lineTo(position.x + MAG_SIZE, squareY + offset);
    }

    context.stroke();

    // the pupil is the sampled pixel in the middle, not a corner swatch
    const pupilX = position.x + MAG_SIZE / 2 - MAG_CELL / 2;
    const pupilY = position.y + MAG_EYE_HEIGHT / 2 - MAG_CELL / 2;

    if (options.hex) {
      context.fillStyle = options.hex;
      context.fillRect(pupilX, pupilY, MAG_CELL, MAG_CELL);
    }

    context.lineWidth = 1.5;
    context.strokeStyle = "#ffffff";
    context.strokeRect(pupilX, pupilY, MAG_CELL, MAG_CELL);
    context.lineWidth = 1;
    context.strokeStyle = "#000000";
    context.strokeRect(pupilX, pupilY, MAG_CELL, MAG_CELL);
    context.restore();

    context.lineWidth = 3;
    context.strokeStyle = "rgba(0, 0, 0, 0.75)";
    traceEye(0, 0);
    context.stroke();
    context.lineWidth = 1;
    context.strokeStyle = "rgba(255, 255, 255, 0.95)";
    traceEye(0, 0);
    context.stroke();

    if (options.hex) {
      const labelY = position.y + MAG_EYE_HEIGHT + MAG_LABEL_GAP;

      context.fillStyle = "rgba(0, 0, 0, 0.75)";
      context.fillRect(position.x, labelY, MAG_SIZE, MAG_LABEL_HEIGHT);
      context.fillStyle = "#ffffff";
      context.font = "10px monospace";
      context.fillText(
        options.hex.toUpperCase(),
        position.x + 4,
        labelY + MAG_LABEL_HEIGHT - 4
      );
    }
  }
}
