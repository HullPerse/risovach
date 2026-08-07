import type { RefObject } from "react";
import type Konva from "konva";

export interface Point {
  x: number;
  y: number;
}

export interface DrawingLine {
  points: Point[];
  color: string;
  brushSize: number;
  opacity: number;
  tool: CanvasTool;
}

export interface RequestImageOptions {
  filename?: string;
}

export interface CanvasAPI {
  undo: () => void;
  redo: () => void;
  clear: () => void;
  resetView: () => void;
  canUndo: boolean;
  canRedo: boolean;
  requestImage: (options?: RequestImageOptions) => Promise<File | null>;
}

export interface CanvasZoomConfig {
  initialZoom?: number;
  step?: number;
  min?: number;
  max?: number;
}

export interface CanvasPanningConfig {
  allowLeftClickPan?: boolean;
  allowMiddleClickPan?: boolean;
  allowRightClickPan?: boolean;
}

export interface CanvasProps {
  className?: string;
  color: string;
  brushSize: number;
  tool: Partial<CanvasTool>;
  opacity?: number;
  brushSizeRange?: { min: number; max: number };
  onBrushSizeChange?: (size: number) => void;
  onOpacityChange?: (opacity: number) => void;
  onColorPick?: (color: string) => void;
  onToolChange?: (tool: CanvasTool) => void;
  onToolCancel?: () => void;
  onMount?: (api: CanvasAPI) => void;
  zoom?: CanvasZoomConfig;
  limitToBounds?: boolean;
  panning?: CanvasPanningConfig;
  centerOnInit?: boolean;
  dimensions: { width: number; height: number };
}

export type CanvasTool = "draw" | "eraser" | "eyedropper";

export interface CanvasInteractionProps {
  dimensions: { width: number; height: number };
  color: string;
  brushSize: number;
  tool: CanvasTool;
  opacity: number;
  brushSizeRange: { min: number; max: number };
  onBrushSizeChange?: (size: number) => void;
  onOpacityChange?: (opacity: number) => void;
  onColorPick?: (color: string) => void;
  onToolChange?: (tool: CanvasTool) => void;
  onToolCancel?: () => void;
  limitToBounds: boolean;
  panning: CanvasPanningConfig;
  centerOnInit: boolean;
  zoomConfig: {
    initialZoom: number;
    zoomStep: number;
    zoomMin: number;
    zoomMax: number;
  };
  drawingLayerRef: RefObject<Konva.Layer | null>;
}

export interface PanStart {
  pointerX: number;
  pointerY: number;
  offsetX: number;
  offsetY: number;
}

export interface AltStart {
  x: number;
  y: number;
  size: number;
  opacity: number;
}

export interface CanvasTransform {
  fitScale: number;
  effectiveScale: number;
  effectiveX: number;
  effectiveY: number;
  centerScale: number;
}
