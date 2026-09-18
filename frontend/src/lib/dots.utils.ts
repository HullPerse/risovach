import { CACHE_PREFIX, SPACING } from "@/config/dots.config";
import { isGridInfo } from "@/lib/schemas/dots.schema";
import type {
  GridDot,
  GridInfo,
  GridState,
  GridWindow,
  Rgb,
} from "@/types/shared/dots";

import { attemptSync, reportBackgroundError } from "./attempt.utils";

const cacheKey = (width: number, height: number): string => {
  return `${CACHE_PREFIX}:${SPACING}:${Math.round(width)}:${Math.round(height)}`;
};

export const buildGrid = (width: number, height: number): GridInfo => {
  const cols: number = Math.max(1, Math.floor(width / SPACING));
  const rows: number = Math.max(1, Math.floor(height / SPACING));

  const sx: number = (width - (cols - 1) * SPACING) / 2;
  const sy: number = (height - (rows - 1) * SPACING) / 2;

  const dots: GridDot[] = [];

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      dots.push({ x: sx + c * SPACING, y: sy + r * SPACING });
    }
  }

  return { cols, dots, rows, spacing: SPACING, sx, sy };
};

export const loadGridFromCache = (
  width: number,
  height: number
): GridInfo | null => {
  const [parsed, error] = attemptSync(() => {
    const raw = window.sessionStorage.getItem(cacheKey(width, height));
    if (!raw) return null;
    const value = JSON.parse(raw);
    return isGridInfo(value) ? value : null;
  });
  if (error) return null;
  return parsed;
};

export const saveGridToCache = (
  grid: GridInfo,
  width: number,
  height: number
): void => {
  const [, error] = attemptSync(() =>
    window.sessionStorage.setItem(cacheKey(width, height), JSON.stringify(grid))
  );
  if (error) reportBackgroundError("dots:grid-cache", error);
};

export const clientToLocal = (
  clientX: number,
  clientY: number,
  rect: DOMRect
): { x: number; y: number } => ({
  x: clientX - rect.left,
  y: clientY - rect.top,
});

const gridWindow = (
  x: number,
  y: number,
  radius: number,
  grid: GridInfo
): GridWindow => {
  const { cols, rows, spacing, sx, sy } = grid;
  return {
    maxCol: Math.min(cols - 1, Math.floor((x + radius - sx) / spacing)),
    maxRow: Math.min(rows - 1, Math.floor((y + radius - sy) / spacing)),
    minCol: Math.max(0, Math.floor((x - radius - sx) / spacing)),
    minRow: Math.max(0, Math.floor((y - radius - sy) / spacing)),
  };
};

export const findNearestDot = (
  x: number,
  y: number,
  maxDist: number,
  grid: GridInfo
): number | null => {
  const { cols, dots } = grid;
  const maxD2 = maxDist * maxDist;
  const { maxCol, maxRow, minCol, minRow } = gridWindow(x, y, maxDist, grid);

  let best: number | null = null;
  let bestD2 = maxD2;

  for (let r = minRow; r <= maxRow; r += 1) {
    for (let c = minCol; c <= maxCol; c += 1) {
      const i = r * cols + c;
      const dot = dots[i];
      const dx = dot.x - x;
      const dy = dot.y - y;
      const d2 = dx * dx + dy * dy;

      if (d2 < bestD2) {
        bestD2 = d2;
        best = i;
      }
    }
  }

  return best;
};

export const getDotsInRadius = (
  x: number,
  y: number,
  radius: number,
  grid: GridInfo
): { index: number; proximity: number }[] => {
  const { cols, dots } = grid;
  const r2 = radius * radius;
  const { maxCol, maxRow, minCol, minRow } = gridWindow(x, y, radius, grid);

  const result: { index: number; proximity: number }[] = [];

  for (let r = minRow; r <= maxRow; r += 1) {
    for (let c = minCol; c <= maxCol; c += 1) {
      const i = r * cols + c;
      const dot = dots[i];
      const dx = dot.x - x;
      const dy = dot.y - y;
      const d2 = dx * dx + dy * dy;

      if (d2 <= r2) {
        result.push({ index: i, proximity: 1 - Math.sqrt(d2) / radius });
      }
    }
  }

  return result;
};

export const pointToDistance = (
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = dx * dx + dy * dy;

  if (length === 0) return Math.hypot(px - x1, py - y1);

  const t = Math.max(
    0,
    Math.min(1, ((px - x1) * dx + (py - y1) * dy) / length)
  );

  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
};

export const hexToRgb = (hex: string): Rgb => {
  const clean = hex.replace("#", "");
  const value =
    clean.length === 3 ? [...clean].map((ch) => ch + ch).join("") : clean;
  const num = Number.parseInt(value, 16);

  if (Number.isNaN(num)) return { b: 0, g: 0, r: 0 };

  return {
    b: num % 256,
    g: Math.floor(num / 256) % 256,
    r: Math.floor(num / 65_536) % 256,
  };
};

export const mixColors = (from: Rgb, to: Rgb, t: number): string => {
  const k = Math.min(1, Math.max(0, t));
  const r = Math.round(from.r + (to.r - from.r) * k);
  const g = Math.round(from.g + (to.g - from.g) * k);
  const b = Math.round(from.b + (to.b - from.b) * k);

  return `rgb(${r}, ${g}, ${b})`;
};

// cached grid skips the intro stagger animation
export const getGridState = (): GridState => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const cached = loadGridFromCache(width, height);

  return {
    grid: cached ?? buildGrid(width, height),
    skipAnimation: cached !== null,
  };
};
