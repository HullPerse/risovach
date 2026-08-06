import type { WsClient } from "@/types/websocket";

const clients = new Set<WsClient>();

export const registerClient = (ws: WsClient) => clients.add(ws);
export const unregisterClient = (ws: WsClient) => clients.delete(ws);
export const getClientCount = (): number => clients.size;

export function broadcast(channel: string, action: string, id?: string) {
  const payload = JSON.stringify({ channel, action, id });

  for (const client of clients) {
    try {
      client.send(payload);
    } catch {
      clients.delete(client);
    }
  }
}
