import type { RefObject } from "react";

import type { DrawingBridge } from "../../engine/bridge/bridge.engine";
import type { OverlaySurface } from "../../engine/render/overlaySurface.engine";
import type { TileSurface } from "../../engine/render/tileSurface.engine";
import type { RGB } from "../shared/color";
import type { BrushSettings, StrokeSample } from "./brush";
import type {
  CanvasTool,
  DrawingInputOptions,
  Point,
  RequestImageOptions,
} from "./canvas";

export interface Size {
  height: number;
  width: number;
}

export interface Rect {
  height: number;
  width: number;
  x: number;
  y: number;
}

export type LayerId = number;
export type TileKey = number;
export type BlendMode = "source-over" | "destination-out";

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface ZoomLimits {
  max: number;
  min: number;
}

export interface TileGrid {
  cols: number;
  rows: number;
}

export type TileSourceKind = "layer" | "overlay";

/**
 * A reference to a tile instead of its pixels. The core owns the pixels, and
 * the output pulls them by this reference, only when the version left the
 * cache. A frame then carries no kilobytes on every pointer move.
 */
export interface TileRef {
  key: TileKey;
  layerId: LayerId;
  source: TileSourceKind;
  version: number;
}

export interface TileDrawItem extends TileRef {
  size: number;
  x: number;
  y: number;
}

/** How the output receives tile pixels. The buffer belongs to the output. */
export interface TileReader {
  /**
   * Tile side in pixels. The number belongs to the core and is read from it,
   * never kept as a second copy: values that drifted apart would give seams
   * between tiles and cut pixels at the edge.
   */
  readonly tileSize: number;
  readTile: (ref: TileRef, target: Uint8Array) => boolean;
}

/** Layer description for the UI. There are no pixels here and never will be. */
export interface LayerInfo {
  id: LayerId;
  name: string;
  opacity: number;
  visible: boolean;
}

export interface OverlayInfo {
  layerId: LayerId;
  mode: BlendMode;
  opacity: number;
}

/** Everything frame building needs. Split from commands on purpose. */
export interface TileRefSource {
  readonly activeLayerId: LayerId;
  readonly layers: LayerInfo[];
  readonly overlay: OverlayInfo | null;
  readonly size: Size;
  layerTiles: (layerId: LayerId, rect?: Rect) => TileRef[];
  overlayTiles: (rect?: Rect) => TileRef[];
}

/**
 * Drawing core behind one seam: document, layers, tiles, brush, tool, stroke,
 * history and colour sampling. The only implementation is Rust over
 * WebAssembly (`WasmDrawingCore`); the seam, input and canvas see just this.
 */
export interface DrawingCore extends TileReader, TileRefSource {
  beginStroke: (sample: StrokeSample) => void;
  clearLayer: () => boolean;
  /** Frees module memory. Required: the collector cannot see it. */
  dispose: () => void;
  endStroke: () => boolean;
  /** Region fill at a point. `false` when nothing changed. */
  fill: (point: Point) => boolean;
  pushSamples: (samples: StrokeSample[]) => void;
  readonly canRedo: boolean;
  readonly canUndo: boolean;
  readonly hasContent: boolean;
  readonly strokeActive: boolean;
  readonly brush: BrushSettings;
  readonly tool: CanvasTool;
  redo: () => boolean;
  sampleColor: (point: Point) => string | null;
  /** Whole `.hpd` project file: document, layers and tiles. */
  saveProject: () => Uint8Array;
  setBrush: (brush: BrushSettings) => boolean;
  setTool: (tool: CanvasTool) => boolean;
  undo: () => boolean;
}

export interface LayerFrame {
  items: TileDrawItem[];
  layerId: LayerId;
  mode: BlendMode;
  opacity: number;
}

export interface RenderFrame {
  camera: Camera;
  document: Size;
  groups: LayerFrame[];
  overlay: LayerFrame | null;
  viewport: Size;
}

export interface FrameIndexEntry {
  size: number;
  version: number;
  x: number;
  y: number;
}

export interface StrokeSampleInput {
  pressure: number;
  tiltX: number;
  tiltY: number;
  time: number;
  x: number;
  y: number;
}

export interface DrawingCanvasState {
  canRedo: boolean;
  canUndo: boolean;
  /** Size of the open document. An opened project brings its own. */
  documentSize: Size;
  empty: boolean;
  /**
   * Message for the page when the core did not load, null when it works.
   * Without it a failed load looks like an empty canvas nobody can draw on.
   */
  error: string | null;
  zoom: number;
}

export interface DrawingCanvasAPI {
  canRedo: boolean;
  canUndo: boolean;
  clear: () => void;
  /**
   * Opens a project instead of the current drawing. Gives `false` when the
   * file is not a project or cannot be read: the canvas stays unchanged.
   */
  loadProject: (bytes: Uint8Array) => Promise<boolean>;
  redo: () => void;
  requestImage: (options?: RequestImageOptions) => Promise<File | null>;
  requestProject: () => File | null;
  resetView: () => void;
  undo: () => void;
}

export interface DrawingCanvasProps {
  brush: BrushSettings;
  className?: string;
  /**
   * Size of a new document. An opened project brings its size from the file,
   * so this prop sets the canvas only when a drawing starts from scratch.
   */
  documentSize: Size;
  onColorPick: (hex: string) => void;
  onStateChange?: (state: DrawingCanvasState) => void;
  onToolCancel: () => void;
  onToolChange: (tool: CanvasTool) => void;
  tool: CanvasTool;
  zoomLimits?: ZoomLimits;
}

/**
 * Panel, thumbnail and window rectangle of the minimap. All rectangles are in
 * screen CSS pixels; `scale` is thumbnail pixels per document pixel.
 */
export interface MinimapLayout {
  image: Rect;
  panel: Rect;
  scale: number;
}

export interface OverlayState {
  hex: string | null;
  inside: boolean;
  /** Pointer sits on the minimap panel: the panel goes lighter and is dragged. */
  minimapHover: boolean;
  pointer: Point | null;
}

export interface OverlayOptions {
  brush: BrushSettings;
  camera: Camera;
  /**
   * Screen rectangle the tile surface repainted this frame, or null when it
   * drew nothing. The minimap copies exactly this from the source canvas, so
   * the thumbnail follows the drawing without reading the document again.
   */
  dirty: Rect | null;
  document: Size;
  hex: string | null;
  /** Pointer on the minimap: the panel goes lighter so the sheet shows through. */
  minimapHover: boolean;
  pointer: Point | null;
  source: HTMLCanvasElement | null;
  /** Tile side from the core: the reticle and the loupe mark a drawn pixel. */
  tileSize: number;
  tool: CanvasTool;
  viewport: Size;
}

// Almond eye outline: two quadratic curves through the corners.
// The curve peaks land exactly on the box top and bottom.
export interface EyeCurve {
  bottomControl: Point;
  left: Point;
  right: Point;
  topControl: Point;
}

// One arm of the eyedropper reticle, screen pixels.
export interface PixelSegment {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

// The document pixel the eyedropper is going to sample and the corner marks
// around it. Cell and crop both come from the same integer pixel, or the
// loupe would show a neighbour of the colour it picks.
export interface PixelReticle {
  cell: Rect;
  segments: PixelSegment[];
}

export interface BridgeOptions {
  core: DrawingCore;
  limits?: ZoomLimits;
  viewport: Size;
}

export interface InputContext {
  bridge: DrawingBridge | null;
  containerRef: RefObject<HTMLDivElement | null>;
  optionsRef: RefObject<DrawingInputOptions>;
  overlayState: RefObject<OverlayState>;
  requestOverlayRender: () => void;
}

export interface PanStart {
  point: Point;
  pointerId: number;
}

export interface Surfaces {
  overlay: OverlaySurface;
  tiles: TileSurface;
}
