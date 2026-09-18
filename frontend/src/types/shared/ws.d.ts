import type { z } from "zod";

import type { wsMessageSchema } from "@/lib/schemas/ws.schema";

export type WsMessage = z.infer<typeof wsMessageSchema>;
