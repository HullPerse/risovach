import {
  CAMERA_FIT_MAX_SCALE,
  CAMERA_ZOOM_MAX,
  CAMERA_ZOOM_MIN,
} from "@/config/drawing.config";
import {
  centerCameraOn,
  clampZoom,
  createCamera,
  panCamera,
  zoomCameraAt,
} from "@/lib/camera.utils";
import type { BrushSettings, StrokeSample } from "@/types/engine/brush";
import type { CanvasTool, Point } from "@/types/engine/canvas";
import type {
  BridgeOptions,
  Camera,
  DrawingCore,
  LayerInfo,
  RenderFrame,
  Size,
  ZoomLimits,
} from "@/types/engine/drawing";

import { renderFrame } from "@/engine/render/compositor.engine";

/**
 * Seam between the UI and the drawing core.
 * Camera, viewport and change subscription live here; the document, layers,
 * brush, stroke and history live in the Rust core behind it.
 * Pixels are taken by tile reference, never copied through this class.
 */
export class DrawingBridge {
  readonly core: DrawingCore;
  private readonly listeners = new Set<() => void>();
  private limits: ZoomLimits;
  private view: Camera;
  private viewport: Size;

  constructor(options: BridgeOptions) {
    this.core = options.core;
    this.limits = options.limits ?? {
      max: CAMERA_ZOOM_MAX,
      min: CAMERA_ZOOM_MIN,
    };
    this.viewport = options.viewport;
    this.view = this.fittedCamera();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  };

  get camera(): Camera {
    return { ...this.view };
  }

  get zoom(): number {
    return this.view.zoom;
  }

  get size(): Size {
    return this.core.size;
  }

  get viewSize(): Size {
    return this.viewport;
  }

  get brushSettings(): BrushSettings {
    return this.core.brush;
  }

  get toolName(): CanvasTool {
    return this.core.tool;
  }

  get canUndo(): boolean {
    return this.core.canUndo;
  }

  get canRedo(): boolean {
    return this.core.canRedo;
  }

  get hasContent(): boolean {
    return this.core.hasContent;
  }

  get layers(): LayerInfo[] {
    return this.core.layers;
  }

  setViewport(size: Size): void {
    this.viewport = size;
    this.notify();
  }

  setZoomLimits(limits: ZoomLimits): void {
    if (limits.max === this.limits.max && limits.min === this.limits.min) {
      return;
    }

    this.limits = limits;
    this.view = { ...this.view, zoom: clampZoom(this.view.zoom, limits) };
    this.notify();
  }

  setBrush(brush: BrushSettings): void {
    if (this.core.setBrush(brush)) {
      this.notify();
    }
  }

  setTool(tool: CanvasTool): void {
    if (this.core.setTool(tool)) {
      this.notify();
    }
  }

  beginStroke(sample: StrokeSample): void {
    this.core.beginStroke(sample);
    this.notify();
  }

  pushSamples(samples: StrokeSample[]): void {
    if (samples.length === 0) {
      return;
    }

    this.core.pushSamples(samples);
    this.notify();
  }

  endStroke(): boolean {
    if (!this.core.strokeActive) {
      return false;
    }

    const changed = this.core.endStroke();

    this.notify();

    return changed;
  }

  undo(): boolean {
    if (!this.core.undo()) {
      return false;
    }

    this.notify();

    return true;
  }

  redo(): boolean {
    if (!this.core.redo()) {
      return false;
    }

    this.notify();

    return true;
  }

  clearLayer(): boolean {
    if (!this.core.clearLayer()) {
      return false;
    }

    this.notify();

    return true;
  }

  /** One fill is one history step inside the core. */
  fill(point: Point): boolean {
    if (!this.core.fill(point)) {
      return false;
    }

    this.notify();

    return true;
  }

  zoomAt(screenPoint: Point, factor: number): void {
    const next = zoomCameraAt(
      this.view,
      this.viewport,
      this.size,
      screenPoint,
      factor,
      this.limits
    );

    if (next === this.view) {
      return;
    }

    this.view = next;
    this.notify();
  }

  /**
   * Panning has no limit: the sheet may leave the screen completely, and the
   * minimap plus "fit" are how it comes back. Clamping here is what used to
   * keep it in sight, and also what made a document smaller than the viewport
   * impossible to move at all.
   */
  panBy(delta: Point): void {
    if (delta.x === 0 && delta.y === 0) {
      return;
    }

    this.view = panCamera(this.view, delta);
    this.notify();
  }

  /** Puts a document point in the middle of the viewport. Used by the minimap. */
  centerOn(point: Point): void {
    const next = centerCameraOn(this.view, this.size, point);

    if (next.x === this.view.x && next.y === this.view.y) {
      return;
    }

    this.view = next;
    this.notify();
  }

  fitView(): void {
    this.view = this.fittedCamera();
    this.notify();
  }

  sampleColor(point: Point): string | null {
    return this.core.sampleColor(point);
  }

  frame(): RenderFrame {
    return renderFrame({
      camera: this.view,
      source: this.core,
      tileSize: this.core.tileSize,
      viewport: this.viewport,
    });
  }

  private fittedCamera(): Camera {
    if (this.viewport.width <= 0 || this.viewport.height <= 0) {
      return createCamera(clampZoom(1, this.limits));
    }

    const scale = Math.min(
      this.viewport.width / this.size.width,
      this.viewport.height / this.size.height,
      CAMERA_FIT_MAX_SCALE
    );

    return createCamera(clampZoom(scale, this.limits));
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
