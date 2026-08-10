import type { WsClient } from "@/types/websocket";

const clients = new Set<WsClient>();

export const registerClient = (ws: WsClient) => clients.add(ws);
export const unregisterClient = (ws: WsClient) => clients.delete(ws);
export const getClientCount = (): number => clients.size;

export const broadcast = (channel: string, action: string, id?: string) => {
  const payload = JSON.stringify({ action, channel, id });

  for (const client of clients) {
    try {
      client.send(payload);
    } catch {
      clients.delete(client);
    }
  }
};
