import type { RefObject } from "react";

import type { DrawingBridge } from "../../engine/bridge/bridge.engine";
import type { BrushSettings } from "./brush";
import type {
  DrawingCanvasAPI,
  DrawingCanvasState,
  DrawingCore,
  OverlayState,
  Size,
  ZoomLimits,
} from "./drawing";

export interface Point {
  x: number;
  y: number;
}

export type CanvasTool =
  | "draw"
  | "pencil"
  | "eraser"
  | "fill"
  | "eyedropper";

export interface RequestImageOptions {
  filename?: string;
}

export interface PointerPair {
  a: Point;
  b: Point;
}

export interface DrawingInputOptions {
  bridge: DrawingBridge | null;
  containerRef: RefObject<HTMLDivElement | null>;
  onColorPick: (hex: string) => void;
  onToolCancel: () => void;
  onToolChange: (tool: CanvasTool) => void;
  overlayState: RefObject<OverlayState>;
  /**
   * Asks for a new frame when only the pointer moved. The document is not
   * rebuilt then: the tile index and the frame maps are not free, and hover
   * goes through here on every mouse move.
   */
  requestOverlayRender: () => void;
}

export interface DrawingHookOptions {
  brush: BrushSettings;
  documentSize: Size;
  onStateChange?: (state: DrawingCanvasState) => void;
  tool: CanvasTool;
  zoomLimits?: ZoomLimits;
}

export interface DrawingHookResult {
  api: DrawingCanvasAPI;
  bridge: DrawingBridge | null;
  containerRef: RefObject<HTMLDivElement | null>;
  overlayRef: RefObject<HTMLCanvasElement | null>;
  overlayState: RefObject<OverlayState>;
  requestOverlayRender: () => void;
  surfaceRef: RefObject<HTMLCanvasElement | null>;
}

export interface CacheEntry {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  image: ImageData;
  pixels: Uint8Array;
  version: number;
}
