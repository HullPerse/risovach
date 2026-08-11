import { SPACING } from "@/config/dots.config";
import type { GridDot, GridInfo } from "@/types/dots";

export const buildGrid = (
  width: number = window.innerWidth,
  height: number = window.innerHeight
): GridInfo => {
  const spacing: number = SPACING;
  const cols: number = Math.max(1, Math.floor(width / spacing));
  const rows: number = Math.max(1, Math.floor(height / spacing));

  const sx: number = (width - (cols - 1) * spacing) / 2;
  const sy: number = (height - (rows - 1) * spacing) / 2;

  const dots: GridDot[] = [];

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      dots.push({ x: sx + c * spacing, y: sy + r * spacing });
    }
  }

  return { cols, dots, rows, spacing, sx, sy };
};

const CACHE_PREFIX = "dots:grid";

const cacheKey = (width: number, height: number): string =>
  `${CACHE_PREFIX}:${SPACING}:${Math.round(width)}:${Math.round(height)}`;

const isGridInfo = (value: unknown): value is GridInfo => {
  if (typeof value !== "object" || value === null) return false;

  const grid = value as Partial<GridInfo>;

  if (typeof grid.cols !== "number") return false;
  if (typeof grid.rows !== "number") return false;
  if (typeof grid.spacing !== "number") return false;
  if (typeof grid.sx !== "number") return false;
  if (typeof grid.sy !== "number") return false;
  if (!Number.isInteger(grid.cols)) return false;
  if (!Number.isInteger(grid.rows)) return false;
  if (!Array.isArray(grid.dots)) return false;
  if (grid.dots.length !== grid.cols * grid.rows) return false;

  return grid.dots.every(
    (dot) => typeof dot.x === "number" && typeof dot.y === "number"
  );
};

export const loadGridFromCache = (
  width: number,
  height: number
): GridInfo | null => {
  try {
    const raw = window.sessionStorage.getItem(cacheKey(width, height));
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    return isGridInfo(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const saveGridToCache = (
  grid: GridInfo,
  width: number,
  height: number
): void => {
  try {
    window.sessionStorage.setItem(
      cacheKey(width, height),
      JSON.stringify(grid)
    );
  } catch {
    /* storage unavailable — ignore */
  }
};

export const clientToLocal = (
  clientX: number,
  clientY: number,
  rect: DOMRect
): { x: number; y: number } => ({
  x: clientX - rect.left,
  y: clientY - rect.top,
});

export const findNearestDot = (
  x: number,
  y: number,
  maxDist: number,
  grid: GridInfo
): number | null => {
  const { cols, dots, rows, spacing, sx, sy } = grid;
  const maxD2 = maxDist * maxDist;

  const minCol = Math.max(0, Math.floor((x - maxDist - sx) / spacing));
  const maxCol = Math.min(cols - 1, Math.floor((x + maxDist - sx) / spacing));
  const minRow = Math.max(0, Math.floor((y - maxDist - sy) / spacing));
  const maxRow = Math.min(rows - 1, Math.floor((y + maxDist - sy) / spacing));

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
  const { cols, dots, rows, spacing, sx, sy } = grid;
  const r2 = radius * radius;

  const minCol = Math.max(0, Math.floor((x - radius - sx) / spacing));
  const maxCol = Math.min(cols - 1, Math.floor((x + radius - sx) / spacing));
  const minRow = Math.max(0, Math.floor((y - radius - sy) / spacing));
  const maxRow = Math.min(rows - 1, Math.floor((y + radius - sy) / spacing));

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

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

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
  const r = Math.round(from.r + (to.r - from.r) * t);
  const g = Math.round(from.g + (to.g - from.g) * t);
  const b = Math.round(from.b + (to.b - from.b) * t);

  return `rgb(${r}, ${g}, ${b})`;
};

export const getGridState = () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const cached = loadGridFromCache(width, height);

  return {
    grid: cached ?? buildGrid(width, height),
    skipAnimation: cached !== null,
  };
};
