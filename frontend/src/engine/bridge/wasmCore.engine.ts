import {
  DEFAULT_BRUSH,
  MAX_COLOR,
  MODE_DESTINATION_OUT,
  NO_OVERLAY,
  SAMPLE_STRIDE,
} from "@/config/drawing.config";
import { rgbToHex } from "@/lib/color.utils";
import { LAYERS_SCHEMA } from "@/lib/schemas/layers.schema";
import type { BrushSettings, StrokeSample } from "@/types/engine/brush";
import type { CanvasTool, Point } from "@/types/engine/canvas";
import type {
  DrawingCore,
  LayerInfo,
  OverlayInfo,
  Rect,
  Size,
  TileRef,
  TileSourceKind,
} from "@/types/engine/drawing";
import type { DrawingEngine } from "@/wasm/drawing/drawing_engine";

import {
  drawingEnginePixels,
  drawingEngineTileSize,
  loadDrawingEngine,
} from "./wasm.engine";

/** Turns flat "key, version" pairs into tile references. */
const toRefs = (
  flat: Uint32Array,
  layerId: number,
  source: TileSourceKind
): TileRef[] => {
  const refs: TileRef[] = [];

  for (let index = 0; index + 1 < flat.length; index += 2) {
    refs.push({ key: flat[index], layerId, source, version: flat[index + 1] });
  }

  return refs;
};

/**
 * Rust core over WebAssembly. Rust owns the pixels; the output copies them
 * by address in module memory, which is cheaper than a buffer round trip.
 *
 * Brush and tool are also kept here: the core knows only "eraser", while
 * the palette and the eyedropper are UI state.
 */
export class WasmDrawingCore implements DrawingCore {
  private brushState: BrushSettings = DEFAULT_BRUSH;
  private readonly engine: DrawingEngine;
  /**
   * Tile side comes from the core: grid, output buffers and screen placement
   * all derive from this one number.
   */
  readonly tileSize: number = drawingEngineTileSize();
  private packed = new Float64Array(0);
  private toolState: CanvasTool = "draw";

  constructor(engine: DrawingEngine) {
    this.engine = engine;
  }

  /** Wraps a raw engine with the default brush, ready to draw. */
  private static boot(engine: DrawingEngine): WasmDrawingCore {
    const core = new WasmDrawingCore(engine);

    core.setBrush(DEFAULT_BRUSH);

    return core;
  }

  static async create(documentSize: Size): Promise<WasmDrawingCore> {
    const Engine = await loadDrawingEngine();

    return WasmDrawingCore.boot(
      new Engine(documentSize.width, documentSize.height)
    );
  }

  /**
   * Opens a project. The canvas size comes from the file, so no core of the
   * expected size is created up front: a foreign file never gets that far.
   */
  static async fromProject(bytes: Uint8Array): Promise<WasmDrawingCore> {
    const Engine = await loadDrawingEngine();

    let engine: DrawingEngine;

    try {
      engine = Engine.load(bytes);
    } catch (error: unknown) {
      // The binding throws a string, not an error: that is the wasm edge.
      throw new Error(
        typeof error === "string" ? error : "project file is unreadable",
        { cause: error }
      );
    }

    return WasmDrawingCore.boot(engine);
  }

  /** Whole project file. Bytes leave module memory as one copy. */
  saveProject(): Uint8Array {
    return this.engine.save_project();
  }

  get size(): Size {
    return { height: this.engine.height(), width: this.engine.width() };
  }

  /**
   * The document lives in module memory, where the garbage collector cannot
   * see it, so without this call every visit would leave an engine running.
   */
  dispose(): void {
    this.engine.free();
  }

  get activeLayerId(): number {
    return this.engine.active_layer_id();
  }

  get layers(): LayerInfo[] {
    const raw: unknown = this.engine.layers();

    return LAYERS_SCHEMA.parse(raw);
  }

  get brush(): BrushSettings {
    return this.brushState;
  }

  get tool(): CanvasTool {
    return this.toolState;
  }

  get canUndo(): boolean {
    return this.engine.can_undo();
  }

  get canRedo(): boolean {
    return this.engine.can_redo();
  }

  get hasContent(): boolean {
    return this.engine.has_content();
  }

  get strokeActive(): boolean {
    return this.engine.stroke_active();
  }

  get overlay(): OverlayInfo | null {
    const layerId = this.engine.overlay_layer_id();

    if (layerId === NO_OVERLAY) return null;

    return {
      layerId,
      mode:
        this.engine.overlay_mode() === MODE_DESTINATION_OUT
          ? "destination-out"
          : "source-over",
      opacity: this.engine.overlay_opacity(),
    };
  }

  setBrush(brush: BrushSettings): boolean {
    if (this.strokeActive) return false;

    const changed = this.engine.set_brush(
      brush.color,
      brush.size,
      brush.opacity,
      brush.hardness,
      brush.spacing
    );

    if (changed) this.brushState = brush;

    return changed;
  }

  setTool(tool: CanvasTool): boolean {
    if (this.strokeActive || tool === this.toolState) return false;

    this.engine.set_eraser(tool === "eraser");
    this.toolState = tool;

    return true;
  }

  beginStroke(sample: StrokeSample): void {
    this.engine.begin_stroke(
      sample.x,
      sample.y,
      sample.pressure,
      sample.tiltX,
      sample.tiltY,
      sample.time
    );
  }

  pushSamples(samples: StrokeSample[]): void {
    if (!this.strokeActive || samples.length === 0) return;

    const needed = samples.length * SAMPLE_STRIDE;

    if (this.packed.length < needed) {
      this.packed = new Float64Array(needed);
    }

    let index = 0;

    for (const sample of samples) {
      this.packed[index] = sample.x;
      this.packed[index + 1] = sample.y;
      this.packed[index + 2] = sample.pressure;
      this.packed[index + 3] = sample.tiltX;
      this.packed[index + 4] = sample.tiltY;
      this.packed[index + 5] = sample.time;
      index += SAMPLE_STRIDE;
    }

    this.engine.push_samples(this.packed.subarray(0, needed));
  }

  endStroke(): boolean {
    return this.engine.end_stroke();
  }

  undo(): boolean {
    return this.engine.undo();
  }

  redo(): boolean {
    return this.engine.redo();
  }

  clearLayer(): boolean {
    return this.engine.clear_layer();
  }

  fill(point: Point): boolean {
    return this.engine.fill(point.x, point.y);
  }

  sampleColor(point: Point): string | null {
    const packed = this.engine.sample_color(point.x, point.y);

    if (packed > MAX_COLOR) return null;

    // Digits are extracted by division: the project bans bitwise ops, and
    // byte order through a typed array would depend on the platform.
    return rgbToHex({
      b: Math.floor(packed / 65_536) % 256,
      g: Math.floor(packed / 256) % 256,
      r: packed % 256,
    }).toLowerCase();
  }

  layerTiles(layerId: number, rect?: Rect): TileRef[] {
    return toRefs(
      rect
        ? this.engine.tile_index(
            layerId,
            rect.x,
            rect.y,
            rect.width,
            rect.height
          )
        : this.engine.full_layer_index(layerId),
      layerId,
      "layer"
    );
  }

  overlayTiles(rect?: Rect): TileRef[] {
    const area = rect ?? {
      height: this.size.height,
      width: this.size.width,
      x: 0,
      y: 0,
    };

    return toRefs(
      this.engine.overlay_index(area.x, area.y, area.width, area.height),
      this.engine.overlay_layer_id(),
      "overlay"
    );
  }

  /**
   * Copies tile pixels into the output buffer. The address is taken and used
   * at once: no core call happens in between, so nothing can move memory.
   */
  readTile(ref: TileRef, target: Uint8Array): boolean {
    const address =
      ref.source === "overlay"
        ? this.engine.overlay_tile_pointer(ref.key)
        : this.engine.tile_pointer(ref.layerId, ref.key);

    if (address === 0) return false;

    target.set(drawingEnginePixels(address, target.length));

    return true;
  }
}
