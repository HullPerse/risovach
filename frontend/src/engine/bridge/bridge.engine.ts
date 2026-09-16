import {
  CAMERA_LIMIT_TO_BOUNDS,
  CAMERA_ZOOM_MAX,
  CAMERA_ZOOM_MIN,
} from "@/config/drawing.config";
import {
  clampCamera,
  clampZoom,
  createCamera,
  panCamera,
  zoomCameraAt,
} from "@/lib/camera.utils";
import type { BrushSettings, StrokeSample } from "@/types/brush";
import type { CanvasTool, Point } from "@/types/canvas";
import type {
  Camera,
  DrawingCore,
  LayerInfo,
  RenderFrame,
  Size,
  ZoomLimits,
} from "@/types/drawing";

import { renderFrame } from "@/engine/render/compositor.engine";

export interface BridgeOptions {
  core: DrawingCore;
  limits?: ZoomLimits;
  viewport: Size;
}

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
    this.view = clampCamera(this.view, size, this.size, CAMERA_LIMIT_TO_BOUNDS);
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

    this.view = clampCamera(
      next,
      this.viewport,
      this.size,
      CAMERA_LIMIT_TO_BOUNDS
    );
    this.notify();
  }

  panBy(delta: Point): void {
    if (delta.x === 0 && delta.y === 0) {
      return;
    }

    this.view = clampCamera(
      panCamera(this.view, delta),
      this.viewport,
      this.size,
      CAMERA_LIMIT_TO_BOUNDS
    );
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
      1
    );

    return createCamera(clampZoom(scale, this.limits));
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
