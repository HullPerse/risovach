import type Konva from "konva";

import type { Point, RequestImageOptions } from "@/types/canvas";

export const isPointInCanvas = (
  point: Point,
  dimensions: { width: number; height: number },
  margin = 0
): boolean =>
  point.x >= -margin &&
  point.x <= dimensions.width + margin &&
  point.y >= -margin &&
  point.y <= dimensions.height + margin;

export const clampOffset = (
  offset: Point,
  dimensions: { width: number; height: number },
  centerScale: number,
  effectiveScale: number,
  limitToBounds: boolean
): Point => {
  if (!limitToBounds) {
    return offset;
  }
  const minX =
    -(dimensions.width - dimensions.width * centerScale) / 2 -
    dimensions.width * effectiveScale;
  const maxX =
    dimensions.width - (dimensions.width - dimensions.width * centerScale) / 2;
  const minY =
    -(dimensions.height - dimensions.height * centerScale) / 2 -
    dimensions.height * effectiveScale;
  const maxY =
    dimensions.height -
    (dimensions.height - dimensions.height * centerScale) / 2;
  return {
    x: Math.max(minX, Math.min(maxX, offset.x)),
    y: Math.max(minY, Math.min(maxY, offset.y)),
  };
};

export const clipPointsToCanvas = (
  points: Point[],
  dimensions: { width: number; height: number }
): Point[] => {
  if (points.length === 0) {
    return points;
  }
  const margin = 0;
  return points.map((p) => ({
    x: Math.max(-margin, Math.min(dimensions.width + margin, p.x)),
    y: Math.max(-margin, Math.min(dimensions.height + margin, p.y)),
  }));
};

export const hexToRGB = (hex: string, alpha: number) => {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const hexFromPixelComposite = (pixel: Uint8ClampedArray): string => {
  const [r, g, b, a] = pixel;
  const alpha = a / 255;
  const inv = 1 - alpha;
  const fr = Math.round(r * alpha + 255 * inv);
  const fg = Math.round(g * alpha + 255 * inv);
  const fb = Math.round(b * alpha + 255 * inv);

  return `#${[fr, fg, fb]
    .map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0"))
    .join("")}`;
};

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  type: string
): Promise<Blob | null> =>
  new Promise((resolve) => {
    canvas.toBlob(resolve, type);
  });

export const requestImage = async (
  stageRef: React.RefObject<Konva.Stage | null>,
  drawingLayerRef: React.RefObject<Konva.Layer | null>,
  dimensions: { width: number; height: number },

  options?: RequestImageOptions
): Promise<File | null> => {
  const layer = drawingLayerRef.current;
  const stage = stageRef.current;
  if (!layer || !stage) return null;

  const prevScaleX = stage.scaleX();
  const prevScaleY = stage.scaleY();
  const prevX = stage.x();
  const prevY = stage.y();

  stage.scaleX(1);
  stage.scaleY(1);
  stage.x(0);
  stage.y(0);
  stage.draw();

  const canvas = layer.toCanvas({
    height: dimensions.height,
    pixelRatio: 1,
    width: dimensions.width,
    x: 0,
    y: 0,
  });

  stage.scaleX(prevScaleX);
  stage.scaleY(prevScaleY);
  stage.x(prevX);
  stage.y(prevY);
  stage.draw();

  const output = document.createElement("canvas");
  output.width = dimensions.width;
  output.height = dimensions.height;

  const ctx = output.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, dimensions.width, dimensions.height);
  ctx.drawImage(canvas, 0, 0);

  const blob = await canvasToBlob(output, "image/png");

  if (!blob) return null;

  const filename = options?.filename ?? `canvas-${Date.now()}.png`;
  return new File([blob], filename, { type: "image/png" });
};
