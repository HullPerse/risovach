import { z } from "zod";

import type { GridInfo } from "@/types/shared/dots";

export const gridDotSchema = z.object({ x: z.number(), y: z.number() });

export const gridSchema = z
  .object({
    cols: z.number().int(),
    dots: z.array(gridDotSchema),
    rows: z.number().int(),
    spacing: z.number(),
    sx: z.number(),
    sy: z.number(),
  })
  .refine((grid) => grid.dots.length === grid.cols * grid.rows);

// z.number rejects NaN: corrupt grids fail closed to null
export const isGridInfo = (value: unknown): value is GridInfo =>
  gridSchema.safeParse(value).success;
