import { useEffect, useState } from "react";

import { STAGGER_MS_PER_PX } from "@/config/dots.config";
import { useDotsGrid } from "@/lib/dots.utils";

const DotsBackground = () => {
  const {
    containerRef,
    linesGroupRef,
    grid,
    setDotRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerLeave,
  } = useDotsGrid();

  const [dotsVisible, setDotsVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setDotsVisible(true));
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <main
      ref={containerRef}
      role="presentation"
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="absolute inset-0 touch-none overflow-hidden select-none"
    >
      <svg
        className="pointer-events-none absolute inset-0 size-full"
        aria-hidden="true"
      >
        <g>
          {dotsVisible &&
            grid.dots.map((dot, i) => {
              const delay = (dot.x + dot.y) * STAGGER_MS_PER_PX;
              return (
                <circle
                  key={i}
                  ref={(el) => setDotRef(i, el)}
                  className="dot-grid-dot"
                  cx={dot.x}
                  cy={dot.y}
                  r={1.5}
                  style={{ animationDelay: `${delay.toFixed(1)}ms` }}
                />
              );
            })}
        </g>
        <g ref={linesGroupRef} />
      </svg>
    </main>
  );
};

export default DotsBackground;
