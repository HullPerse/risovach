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

export interface CanvasAPI {
  undo: () => void;
  redo: () => void;
  clear: () => void;
  resetView: () => void;
  canUndo: boolean;
  canRedo: boolean;
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
