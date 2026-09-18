import { z } from "zod";

/**
 * The binding hands layers back untyped, so they are parsed here. This is
 * the only untyped edge: everything beyond it is `LayerInfo`.
 */
export const LAYERS_SCHEMA = z.array(
  z.object({
    id: z.number(),
    name: z.string(),
    opacity: z.number(),
    visible: z.boolean(),
  })
);
