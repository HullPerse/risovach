import { useCallback, useEffect, useRef, useState } from "react";

const SPACING = 40;
const HOVER_RADIUS = 100;
const SNAP_RADIUS = 22;
const MAX_DOTS = 3500;
const HOVERED_CLASS = "is-hovered";

interface GridDot {
  x: number;
  y: number;
}

interface GridLine {
  from: number;
  to: number;
}

interface DotGridProps {
  dots: GridDot[];
  setDotRef: (index: number, el: SVGCircleElement | null) => void;
}

const buildGrid = () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  let spacing = SPACING;
  let cols = Math.ceil(width / spacing) + 1;
  let rows = Math.ceil(height / spacing) + 1;

  if (cols * rows > MAX_DOTS) {
    spacing = Math.ceil(Math.sqrt((width * height) / MAX_DOTS));
    cols = Math.ceil(width / spacing) + 1;
    rows = Math.ceil(height / spacing) + 1;
  }

  const next: GridDot[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      next.push({ x: c * spacing, y: r * spacing });
    }
  }
  return next;
};

const DotGrid = ({ dots, setDotRef }: DotGridProps) => (
  <svg className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
    {dots.map((dot, i) => (
      <circle
        key={i}
        ref={(el) => setDotRef(i, el)}
        className="dot-grid-dot"
        cx={dot.x}
        cy={dot.y}
        r={1.5}
      />
    ))}
  </svg>
);

const DotsBackground = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<GridDot[]>([]);
  const dotRefs = useRef<(SVGCircleElement | null)[]>([]);
  const prevHoveredRef = useRef<number[]>([]);
  const lastDotRef = useRef<number | null>(null);
  const isDrawingRef = useRef(false);

  const [dots, setDots] = useState<GridDot[]>(buildGrid);
  const [lines, setLines] = useState<GridLine[]>([]);

  // oxlint-disable-next-line react-doctor/react-compiler-no-manual-memoization
  const setDotRef = useCallback(
    (index: number, el: SVGCircleElement | null) => {
      dotRefs.current[index] = el;
    },
    []
  );

  // oxlint-disable-next-line react-doctor/react-compiler-no-manual-memoization
  const rebuild = useCallback(() => {
    const next = buildGrid();
    dotRefs.current = [];
    dotsRef.current = next;
    prevHoveredRef.current = [];
    isDrawingRef.current = false;
    lastDotRef.current = null;
    setLines([]);
    setDots(next);
  }, []);

  useEffect(() => {
    dotsRef.current = dots;
  }, [dots]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      rebuild();
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [rebuild]);

  const getMouse = (e: { clientX: number; clientY: number }) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const setHovered = (indices: number[]) => {
    const prev = prevHoveredRef.current;
    const prevSet = new Set(prev);
    const nextSet = new Set(indices);

    for (const i of prev) {
      if (!nextSet.has(i)) {
        dotRefs.current[i]?.classList.remove(HOVERED_CLASS);
      }
    }
    for (const i of indices) {
      if (!prevSet.has(i)) {
        dotRefs.current[i]?.classList.add(HOVERED_CLASS);
      }
    }
    prevHoveredRef.current = indices;
  };

  const clearHover = () => {
    for (const i of prevHoveredRef.current) {
      dotRefs.current[i]?.classList.remove(HOVERED_CLASS);
    }
    prevHoveredRef.current = [];
  };

  const findNearestDot = (
    x: number,
    y: number,
    maxDist: number
  ): number | null => {
    const list = dotsRef.current;
    let best: number | null = null;
    let bestD = maxDist * maxDist;
    for (let i = 0; i < list.length; i += 1) {
      const dx = list[i].x - x;
      const dy = list[i].y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD) {
        bestD = d2;
        best = i;
      }
    }
    return best;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const pos = getMouse(e);
    if (!pos) return;

    const dot = findNearestDot(pos.x, pos.y, SNAP_RADIUS);
    if (dot === null) return;

    isDrawingRef.current = true;
    lastDotRef.current = dot;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const pos = getMouse(e);
    if (!pos) return;

    const r2 = HOVER_RADIUS * HOVER_RADIUS;
    const hovered: number[] = [];
    const list = dotsRef.current;
    for (let i = 0; i < list.length; i += 1) {
      const dx = list[i].x - pos.x;
      const dy = list[i].y - pos.y;
      if (dx * dx + dy * dy <= r2) {
        hovered.push(i);
      }
    }
    setHovered(hovered);

    if (!isDrawingRef.current) return;

    const dot = findNearestDot(pos.x, pos.y, SNAP_RADIUS);
    const last = lastDotRef.current;
    if (dot === null || last === null || dot === last) return;

    const a = list[last];
    const b = list[dot];
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    if (dist > SPACING * 1.5) return;

    setLines((prev) => [...prev, { from: last, to: dot }]);
    lastDotRef.current = dot;
  };

  // oxlint-disable-next-line react-doctor/react-compiler-no-manual-memoization
  const stopDrawing = useCallback(() => {
    isDrawingRef.current = false;
    lastDotRef.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener("mouseup", stopDrawing);
    return () => window.removeEventListener("mouseup", stopDrawing);
  }, [stopDrawing]);

  const handleMouseLeave = () => {
    clearHover();
    stopDrawing();
  };

  return (
    <div
      ref={containerRef}
      role="presentation"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="absolute inset-0 overflow-hidden select-none"
    >
      <DotGrid dots={dots} setDotRef={setDotRef} />

      <svg className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
        {lines.map((line, i) => (
          <line
            key={i}
            className="dot-grid-line"
            x1={dots[line.from].x}
            y1={dots[line.from].y}
            x2={dots[line.to].x}
            y2={dots[line.to].y}
          />
        ))}
      </svg>
    </div>
  );
};

export default DotsBackground;
