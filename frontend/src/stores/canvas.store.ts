import { create } from "zustand";

import type { Point, DrawingLine, CanvasTool } from "@/types/canvas";

let nextLineId = 1;

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
    opacity: number
  ) => boolean;
  resetView: (initialZoom: number) => void;
  resetAll: () => void;
}

const initialState = {
  canRedo: false,
  canUndo: false,
  currentPoints: [],
  future: [],
  isAltPressed: false,
  isDrawing: false,
  isPanning: false,
  isSpacePressed: false,
  lines: [],
  mousePos: null,
  panOffset: { x: 0, y: 0 },
  past: [],
  zoomLevel: 1,
};

export const useCanvasStore = create<CanvasState>((set, get) => ({
  ...initialState,

  clear: () => {
    const { lines } = get();
    if (lines.length === 0) {
      return;
    }
    set({
      canRedo: false,
      canUndo: true,
      future: [],
      lines: [],
      past: [...get().past, lines],
    });
  },
  redo: () => {
    const { future, lines, past } = get();
    if (future.length === 0) {
      return;
    }
    set({
      canRedo: future.length > 1,
      canUndo: true,
      future: future.slice(1),
      lines: future[0],
      past: [...past, lines],
    });
  },
  resetAll: () => set({ ...initialState }),
  resetView: (initialZoom) =>
    set({ panOffset: { x: 0, y: 0 }, zoomLevel: initialZoom }),
  saveStroke: (tool, color, brushSize, opacity) => {
    const { currentPoints, lines, past } = get();
    if (currentPoints.length === 0) {
      return false;
    }

    let finalPoints = currentPoints;
    if (finalPoints.length === 1) {
      finalPoints = [finalPoints[0], finalPoints[0]];
    }

    const newLine: DrawingLine = {
      brushSize,
      color: tool === "eraser" ? "white" : color,
      id: nextLineId,
      opacity,
      points: finalPoints,
      tool,
    };
    nextLineId += 1;

    set({
      canRedo: false,
      canUndo: true,
      currentPoints: [],
      future: [],
      lines: [...lines, newLine],
      past: [...past, lines],
    });

    return true;
  },
  setCanRedo: (canRedo) => set({ canRedo }),
  setCanUndo: (canUndo) => set({ canUndo }),
  setCurrentPoints: (currentPoints) => set({ currentPoints }),
  setIsAltPressed: (isAltPressed) => set({ isAltPressed }),
  setIsDrawing: (isDrawing) => set({ isDrawing }),
  setIsPanning: (isPanning) => set({ isPanning }),
  setIsSpacePressed: (isSpacePressed) => set({ isSpacePressed }),
  setLines: (lines) => set({ lines }),
  setMousePos: (mousePos) => set({ mousePos }),
  setPanOffset: (panOffset) => set({ panOffset }),
  setZoomLevel: (zoomLevel) => set({ zoomLevel }),
  undo: () => {
    const { past, lines, future } = get();
    if (past.length === 0) {
      return;
    }
    set({
      canRedo: true,
      canUndo: past.length > 1,
      future: [lines, ...future],
      lines: past.at(-1) ?? lines,
      past: past.slice(0, -1),
    });
  },
}));
