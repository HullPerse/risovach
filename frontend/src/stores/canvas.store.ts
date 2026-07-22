import { create } from "zustand";
import type { Point, DrawingLine, CanvasTool } from "@/types/canvas";

interface CanvasState {
  lines: DrawingLine[];
  currentPoints: Point[];
  isDrawing: boolean;
  isPanning: boolean;
  mousePos: Point | null;
  canUndo: boolean;
  canRedo: boolean;
  zoomLevel: number;
  panOffset: Point;
  isSpacePressed: boolean;
  isAltPressed: boolean;
  past: DrawingLine[][];
  future: DrawingLine[][];

  setLines: (lines: DrawingLine[]) => void;
  setCurrentPoints: (points: Point[]) => void;
  setIsDrawing: (v: boolean) => void;
  setIsPanning: (v: boolean) => void;
  setMousePos: (pos: Point | null) => void;
  setCanUndo: (v: boolean) => void;
  setCanRedo: (v: boolean) => void;
  setZoomLevel: (v: number) => void;
  setPanOffset: (offset: Point) => void;
  setIsSpacePressed: (v: boolean) => void;
  setIsAltPressed: (v: boolean) => void;

  undo: () => void;
  redo: () => void;
  clear: () => void;
  saveStroke: (
    tool: CanvasTool,
    color: string,
    brushSize: number,
    opacity: number,
  ) => boolean;
  resetView: (initialZoom: number) => void;
  resetAll: () => void;
}

const initialState = {
  lines: [],
  currentPoints: [],
  isDrawing: false,
  isPanning: false,
  mousePos: null,
  canUndo: false,
  canRedo: false,
  zoomLevel: 1,
  panOffset: { x: 0, y: 0 },
  isSpacePressed: false,
  isAltPressed: false,
  past: [],
  future: [],
};

export const useCanvasStore = create<CanvasState>((set, get) => ({
  ...initialState,

  setLines: (lines) => set({ lines }),
  setCurrentPoints: (currentPoints) => set({ currentPoints }),
  setIsDrawing: (isDrawing) => set({ isDrawing }),
  setIsPanning: (isPanning) => set({ isPanning }),
  setMousePos: (mousePos) => set({ mousePos }),
  setCanUndo: (canUndo) => set({ canUndo }),
  setCanRedo: (canRedo) => set({ canRedo }),
  setZoomLevel: (zoomLevel) => set({ zoomLevel }),
  setPanOffset: (panOffset) => set({ panOffset }),
  setIsSpacePressed: (isSpacePressed) => set({ isSpacePressed }),
  setIsAltPressed: (isAltPressed) => set({ isAltPressed }),

  undo: () => {
    const { past, lines, future } = get();
    if (past.length === 0) return;
    set({
      lines: past[past.length - 1],
      past: past.slice(0, -1),
      future: [lines, ...future],
      canUndo: past.length > 1,
      canRedo: true,
    });
  },

  redo: () => {
    const { future, lines, past } = get();
    if (future.length === 0) return;
    set({
      lines: future[0],
      past: [...past, lines],
      future: future.slice(1),
      canRedo: future.length > 1,
      canUndo: true,
    });
  },

  clear: () => {
    const { lines } = get();
    if (lines.length === 0) return;
    set({
      past: [...get().past, lines],
      future: [],
      lines: [],
      canUndo: true,
      canRedo: false,
    });
  },

  saveStroke: (tool, color, brushSize, opacity) => {
    const { currentPoints, lines, past } = get();
    if (currentPoints.length === 0) return false;

    let finalPoints = currentPoints;
    if (finalPoints.length === 1) {
      finalPoints = [finalPoints[0], finalPoints[0]];
    }

    const newLine: DrawingLine = {
      points: finalPoints,
      color: tool === "eraser" ? "white" : color,
      brushSize,
      opacity,
      tool,
    };

    set({
      past: [...past, lines],
      future: [],
      lines: [...lines, newLine],
      currentPoints: [],
      canUndo: true,
      canRedo: false,
    });

    return true;
  },

  resetView: (initialZoom) =>
    set({ zoomLevel: initialZoom, panOffset: { x: 0, y: 0 } }),

  resetAll: () => set({ ...initialState }),
}));
