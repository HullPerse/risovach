import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import {
  ERASE_RADIUS,
  HOVER_RADIUS,
  LINE_LIFETIME_MS,
  PRUNE_INTERVAL_MS,
  SNAP_RADIUS,
} from "@/config/dots.config";
import {
  buildGrid,
  clientToLocal,
  findNearestDot,
  getDotsInRadius,
  getGridState,
  pointToDistance,
  saveGridToCache,
} from "@/lib/dots.utils";
import type { GridState, LineData } from "@/types/shared/dots";

export const useDotsGrid = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const containerRectRef = useRef<DOMRect | null>(null);

  const [state, setState] = useState<GridState>(getGridState);

  const { grid, skipAnimation } = state;
  const gridRef = useRef(grid);

  const hoverRef = useRef<Map<number, number>>(new Map());
  const linesRef = useRef<LineData[]>([]);

  const isDrawingRef = useRef(false);
  const isErasingRef = useRef(false);
  const lastDotRef = useRef<number | null>(null);

  const pendingMoveRef = useRef<{ x: number; y: number } | null>(null);
  const moveRafRef = useRef(0);

  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    const rebuild = () => {
      const rect = container.getBoundingClientRect();
      containerRectRef.current = rect;

      isDrawingRef.current = false;
      isErasingRef.current = false;
      lastDotRef.current = null;
      hoverRef.current.clear();
      linesRef.current = [];

      const next = buildGrid(rect.width, rect.height);
      saveGridToCache(next, rect.width, rect.height);
      setState((prev) => ({ grid: next, skipAnimation: prev.skipAnimation }));
    };

    let id = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(id);
      id = requestAnimationFrame(rebuild);
    });

    observer.observe(container);

    return () => {
      cancelAnimationFrame(id);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const stop = () => {
      isDrawingRef.current = false;
      lastDotRef.current = null;
    };

    window.addEventListener("pointerup", stop);
    return () => window.removeEventListener("pointerup", stop);
  }, []);

  useEffect(() => {
    const stop = () => {
      isErasingRef.current = false;
    };

    window.addEventListener("pointerup", stop);
    return () => window.removeEventListener("pointerup", stop);
  }, []);

  useEffect(() => () => cancelAnimationFrame(moveRafRef.current), []);

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = performance.now();
      linesRef.current = linesRef.current.filter(
        (line) => now - line.born <= LINE_LIFETIME_MS
      );
    }, PRUNE_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, []);

  const getMouse = (e: { clientX: number; clientY: number }) => {
    const rect =
      containerRectRef.current ??
      containerRef.current?.getBoundingClientRect() ??
      null;

    if (rect) containerRectRef.current = rect;
    return rect ? clientToLocal(e.clientX, e.clientY, rect) : null;
  };

  const updateHover = (x: number, y: number) => {
    const next = new Map<number, number>();

    const radius = getDotsInRadius(x, y, HOVER_RADIUS, gridRef.current);

    for (const { index, proximity } of radius) {
      next.set(index, proximity);
    }

    hoverRef.current = next;
  };

  const addLine = (from: number, to: number) => {
    const { dots } = gridRef.current;
    const a = dots[from];
    const b = dots[to];

    linesRef.current.push({
      born: performance.now(),
      x1: a.x,
      x2: b.x,
      y1: a.y,
      y2: b.y,
    });
  };

  const eraseLinesAt = (x: number, y: number) => {
    linesRef.current = linesRef.current.filter(
      (line) =>
        pointToDistance(x, y, line.x1, line.y1, line.x2, line.y2) > ERASE_RADIUS
    );
  };

  const processPointerMove = (x: number, y: number) => {
    updateHover(x, y);

    if (isErasingRef.current) return eraseLinesAt(x, y);
    if (!isDrawingRef.current) return;

    const dot = findNearestDot(x, y, SNAP_RADIUS, gridRef.current);
    const last = lastDotRef.current;
    if (dot === null || last === null || dot === last) return;

    const { dots, spacing } = gridRef.current;
    const a = dots[last];
    const b = dots[dot];

    if (Math.hypot(a.x - b.x, a.y - b.y) > spacing * 1.5) return;

    addLine(last, dot);
    lastDotRef.current = dot;
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const pos = getMouse(e);
    if (!pos) return;

    if (e.button === 0) {
      const dot = findNearestDot(pos.x, pos.y, SNAP_RADIUS, gridRef.current);
      if (dot === null) return;

      isDrawingRef.current = true;
      lastDotRef.current = dot;
      return;
    }

    if (e.button === 2) {
      isErasingRef.current = true;
      eraseLinesAt(pos.x, pos.y);
    }
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const pos = getMouse(e);
    if (!pos) return;

    pendingMoveRef.current = pos;
    if (moveRafRef.current) return;

    moveRafRef.current = requestAnimationFrame(() => {
      moveRafRef.current = 0;
      const pending = pendingMoveRef.current;
      pendingMoveRef.current = null;
      if (!pending) return;
      processPointerMove(pending.x, pending.y);
    });
  };

  const handlePointerLeave = () => {
    hoverRef.current.clear();
    isDrawingRef.current = false;
    lastDotRef.current = null;
    isErasingRef.current = false;
  };

  return {
    containerRef,
    grid,
    handlePointerDown,
    handlePointerLeave,
    handlePointerMove,
    hoverRef,
    linesRef,
    skipAnimation,
  };
};
