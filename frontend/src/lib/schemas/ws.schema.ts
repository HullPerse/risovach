import { z } from "zod";

export const wsMessageSchema = z.object({
  action: z.enum(["create", "update", "delete"]),
  channel: z.string().min(1),
  channels: z.array(z.string()).optional(),
  id: z.string().optional(),
});
