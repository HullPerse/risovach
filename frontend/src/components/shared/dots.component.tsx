import { useEffect, useRef, useState } from "react";

import {
  LINE_FADE_MS,
  LINE_LIFETIME_MS,
  STAGGER_MS_PER_PX,
} from "@/config/dots.config";
import { useDotsGrid } from "@/hooks/dots.hook";
import { hexToRgb, mixColors } from "@/lib/dots.utils";

const DOT_RADIUS = 1.5;
const DOT_BASE_ALPHA = 0.5;
const DOT_FADE_MS = 300;
const GRID_HOLD_MS = 250;
const LINE_WIDTH = 3;

/** Cleanup for the paths where an effect has nothing to undo. */
const noCleanup = (): void => {
  // nothing to undo yet
};

const DotsBackground = () => {
  const {
    containerRef,
    grid,
    handlePointerDown,
    handlePointerMove,
    handlePointerLeave,
    hoverRef,
    linesRef,
    skipAnimation,
  } = useDotsGrid();

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startTimeRef = useRef(0);
  const animateAtRef = useRef(0);
  const colorsRef = useRef({ primary: "#ffb858", text: "#000000" });

  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });

    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    const primary = styles.getPropertyValue("--primary").trim();
    const text = styles.getPropertyValue("--text").trim();

    if (primary) colorsRef.current.primary = primary;
    if (text) colorsRef.current.text = text;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || !visible) {
      return noCleanup;
    }

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return noCleanup;
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;

      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;

      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || !visible) {
      return noCleanup;
    }

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return noCleanup;
    }

    startTimeRef.current = performance.now() + GRID_HOLD_MS;
    animateAtRef.current = startTimeRef.current;

    let animationFrame = 0;

    const render = (time: number) => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const { primary, text } = colorsRef.current;
      const hovered = hoverRef.current;

      const textRgb = hexToRgb(text);
      const primaryRgb = hexToRgb(primary);

      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";

      for (let i = 0; i < grid.dots.length; i += 1) {
        const dot = grid.dots[i];

        const inHold = time < animateAtRef.current;
        let alpha = inHold ? 0 : 1;

        if (!skipAnimation && !inHold) {
          const delay = (dot.x + dot.y) * STAGGER_MS_PER_PX;
          const elapsed = time - startTimeRef.current - delay;
          if (elapsed < 0) continue;
          alpha = Math.min(elapsed / DOT_FADE_MS, 1);
        }

        const proximity = hovered.get(i) ?? 0;

        ctx.globalAlpha = alpha * (DOT_BASE_ALPHA + proximity * 0.5);
        ctx.fillStyle =
          proximity > 0 ? mixColors(textRgb, primaryRgb, proximity) : text;

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, DOT_RADIUS * (1 + proximity), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;

      for (const line of linesRef.current) {
        const age = time - line.born;
        if (age > LINE_LIFETIME_MS + LINE_FADE_MS) continue;

        const alpha =
          age > LINE_LIFETIME_MS
            ? 1 - (age - LINE_LIFETIME_MS) / LINE_FADE_MS
            : 1;

        ctx.globalAlpha = alpha;
        ctx.strokeStyle = primary;
        ctx.lineWidth = LINE_WIDTH;
        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;

      animationFrame = requestAnimationFrame(render);
    };

    animationFrame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrame);
  }, [grid, hoverRef, linesRef, skipAnimation, visible]);

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
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
    </main>
  );
};

export default DotsBackground;