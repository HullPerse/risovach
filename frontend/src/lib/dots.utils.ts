import { useCallback, useEffect, useRef, useState } from "react";

import {
  SPACING,
  HOVER_RADIUS,
  SNAP_RADIUS,
  MAX_DOTS,
  ERASE_RADIUS,
  LINE_LIFETIME_MS,
  LINE_FADE_MS,
  PRUNE_INTERVAL_MS,
  SVG_NS,
  PROXIMITY_VAR,
} from "@/config/dots.config";
import type { GridDot, GridInfo, LineNode } from "@/types/dots";

export const buildGrid = (): GridInfo => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  let spacing: number = SPACING;
  let cols: number = Math.ceil(width / spacing) + 1;
  let rows: number = Math.ceil(height / spacing) + 1;

  if (cols * rows > MAX_DOTS) {
    spacing = Math.ceil(Math.sqrt((width * height) / MAX_DOTS));
    cols = Math.ceil(width / spacing) + 1;
    rows = Math.ceil(height / spacing) + 1;
  }

  const dots: GridDot[] = [];
  for (let i = 0; i < rows; i += 1) {
    for (let j = 0; j < cols; j += 1) {
      dots.push({ x: j * spacing, y: i * spacing });
    }
  }

  return { cols, dots, rows, spacing };
};

const pointToSegmentDistance = (
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return Math.hypot(px - x1, py - y1);
  }

  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
};

export const useDotsGrid = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const containerRectRef = useRef<DOMRect | null>(null);
  const dotRefs = useRef<SVGCircleElement[] | null[]>([]);
  const prevHoveredRef = useRef<number[]>([]);
  const lastDotRef = useRef<number | null>(null);
  const isDrawingRef = useRef(false);
  const isErasingRef = useRef(false);
  const linesGroupRef = useRef<SVGGElement>(null);
  const lineNodesRef = useRef<LineNode[]>([]);
  const pendingMoveRef = useRef<{ x: number; y: number } | null>(null);
  const moveRafRef = useRef(0);

  const [grid, setGrid] = useState<GridInfo>(buildGrid);
  const gridRef = useRef(grid);

  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  const setDotRef = useCallback(
    (index: number, el: SVGCircleElement | null) => {
      dotRefs.current[index] = el;
    },
    []
  );

  const rebuild = useCallback(() => {
    const container = containerRef.current;
    if (container) {
      containerRectRef.current = container.getBoundingClientRect();
    }

    for (const el of dotRefs.current) el?.style.removeProperty(PROXIMITY_VAR);

    dotRefs.current = [];
    prevHoveredRef.current = [];
    isDrawingRef.current = false;
    isErasingRef.current = false;
    lastDotRef.current = null;

    setGrid(buildGrid());
  }, []);

  const stopDrawing = useCallback(() => {
    isDrawingRef.current = false;
    lastDotRef.current = null;
  }, []);

  const stopErasing = useCallback(() => {
    isErasingRef.current = false;
  }, []);

  useEffect(() => {
    const container = containerRef.current;

    let id = 0;
    let observer: ResizeObserver | null = null;

    if (container) {
      observer = new ResizeObserver(() => {
        cancelAnimationFrame(id);
        id = requestAnimationFrame(rebuild);
      });
      observer.observe(container);
    }

    return () => {
      cancelAnimationFrame(id);
      observer?.disconnect();
    };
  }, [rebuild]);

  useEffect(() => {
    window.addEventListener("pointerup", stopDrawing);
    return () => window.removeEventListener("pointerup", stopDrawing);
  }, [stopDrawing]);

  useEffect(() => {
    window.addEventListener("pointerup", stopErasing);
    return () => window.removeEventListener("pointerup", stopErasing);
  }, [stopErasing]);

  useEffect(() => () => cancelAnimationFrame(moveRafRef.current), []);

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = performance.now();
      const alive: LineNode[] = [];

      for (const node of lineNodesRef.current) {
        if (now - node.born > LINE_LIFETIME_MS) {
          node.el.classList.add("is-fading");
          window.setTimeout(() => node.el.remove(), LINE_FADE_MS);
        } else {
          alive.push(node);
        }
      }

      lineNodesRef.current = alive;
    }, PRUNE_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, []);

  const getMouse = (e: { clientX: number; clientY: number }) => {
    let rect = containerRectRef.current;

    if (!rect) {
      rect = containerRef.current?.getBoundingClientRect() ?? null;
      if (rect) containerRectRef.current = rect;
    }

    if (!rect) return null;
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const findNearestDot = (
    x: number,
    y: number,
    maxDist: number
  ): number | null => {
    const { cols, dots, rows, spacing } = gridRef.current;
    const maxD2 = maxDist * maxDist;
    const minCol = Math.max(0, Math.floor((x - maxDist) / spacing));
    const maxCol = Math.min(cols - 1, Math.floor((x + maxDist) / spacing));
    const minRow = Math.max(0, Math.floor((y - maxDist) / spacing));
    const maxRow = Math.min(rows - 1, Math.floor((y + maxDist) / spacing));

    let best: number | null = null;
    let bestD = maxD2;

    for (let r = minRow; r <= maxRow; r += 1) {
      for (let c = minCol; c <= maxCol; c += 1) {
        const i = r * cols + c;
        const dot = dots[i];
        const dx = dot.x - x;
        const dy = dot.y - y;
        const d2 = dx * dx + dy * dy;

        if (d2 < bestD) {
          bestD = d2;
          best = i;
        }
      }
    }
    return best;
  };

  const setHovered = (x: number, y: number) => {
    const { cols, dots, rows, spacing } = gridRef.current;
    const r2 = HOVER_RADIUS * HOVER_RADIUS;
    const minCol = Math.max(0, Math.floor((x - HOVER_RADIUS) / spacing));
    const maxCol = Math.min(cols - 1, Math.floor((x + HOVER_RADIUS) / spacing));
    const minRow = Math.max(0, Math.floor((y - HOVER_RADIUS) / spacing));
    const maxRow = Math.min(rows - 1, Math.floor((y + HOVER_RADIUS) / spacing));

    const next: number[] = [];
    const nextSet = new Set<number>();

    for (let r = minRow; r <= maxRow; r += 1) {
      for (let c = minCol; c <= maxCol; c += 1) {
        const i = r * cols + c;
        const dot = dots[i];
        const dx = dot.x - x;
        const dy = dot.y - y;
        const d2 = dx * dx + dy * dy;
        if (d2 <= r2) {
          next.push(i);
          nextSet.add(i);
          const proximity = 1 - Math.sqrt(d2) / HOVER_RADIUS;
          dotRefs.current[i]?.style.setProperty(
            PROXIMITY_VAR,
            proximity.toFixed(3)
          );
        }
      }
    }

    const prev = prevHoveredRef.current;
    for (const i of prev) {
      if (!nextSet.has(i)) {
        dotRefs.current[i]?.style.removeProperty(PROXIMITY_VAR);
      }
    }
    prevHoveredRef.current = next;
  };

  const clearHover = () => {
    for (const i of prevHoveredRef.current) {
      dotRefs.current[i]?.style.removeProperty(PROXIMITY_VAR);
    }
    prevHoveredRef.current = [];
  };

  const addLine = (from: number, to: number) => {
    const group = linesGroupRef.current;
    if (!group) return;

    const { dots } = gridRef.current;
    const a = dots[from];
    const b = dots[to];
    const el = document.createElementNS(SVG_NS, "line");
    el.setAttribute("x1", String(a.x));
    el.setAttribute("y1", String(a.y));
    el.setAttribute("x2", String(b.x));
    el.setAttribute("y2", String(b.y));
    el.classList.add("dot-grid-line");
    group.append(el);
    lineNodesRef.current.push({
      born: performance.now(),
      el,
      x1: a.x,
      x2: b.x,
      y1: a.y,
      y2: b.y,
    });
  };

  const eraseLinesAt = (x: number, y: number) => {
    const remaining: LineNode[] = [];

    for (const node of lineNodesRef.current) {
      const dist = pointToSegmentDistance(
        x,
        y,
        node.x1,
        node.y1,
        node.x2,
        node.y2
      );

      if (dist <= ERASE_RADIUS) node.el.remove();
      else remaining.push(node);
    }

    lineNodesRef.current = remaining;
  };

  const processPointerMove = (x: number, y: number) => {
    setHovered(x, y);

    if (isErasingRef.current) {
      eraseLinesAt(x, y);
      return;
    }

    if (!isDrawingRef.current) return;

    const dot = findNearestDot(x, y, SNAP_RADIUS);
    const last = lastDotRef.current;
    if (dot === null || last === null || dot === last) return;

    const { dots, spacing } = gridRef.current;
    const a = dots[last];
    const b = dots[dot];
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    if (dist > spacing * 1.5) return;

    addLine(last, dot);
    lastDotRef.current = dot;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const pos = getMouse(e);
    if (!pos) return;

    if (e.button === 0) {
      const dot = findNearestDot(pos.x, pos.y, SNAP_RADIUS);

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

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
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
    clearHover();
    stopDrawing();
    stopErasing();
  };

  return {
    containerRef,
    grid,
    handlePointerDown,
    handlePointerLeave,
    handlePointerMove,
    linesGroupRef,
    setDotRef,
  };
};
