import { WS_URL } from "@/config/api.config";
import { wsMessageSchema } from "@/lib/zod.utils";
import type { WsMessage } from "@/lib/zod.utils";

type Listener = (message: WsMessage) => void;

class WsClient {
  private socket: WebSocket | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: number | null = null;
  private manuallyClosed = false;
  private channels = new Map<string, Set<Listener>>();

  subscribe(channel: string, listener: Listener): () => void {
    let listeners = this.channels.get(channel);
    if (!listeners) {
      listeners = new Set();
      this.channels.set(channel, listeners);
    }
    listeners.add(listener);
    this.connect();

    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.channels.delete(channel);
      }
      if (this.channels.size === 0) {
        this.close();
      }
    };
  }

  connect() {
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.manuallyClosed = false;
    this.socket = new WebSocket(WS_URL);

    this.socket.addEventListener("open", () => {
      this.reconnectAttempt = 0;
    });

    this.socket.addEventListener("message", (event) => {
      let message: WsMessage;
      try {
        const raw = JSON.parse(String(event.data));
        const parsed = wsMessageSchema.safeParse(raw);
        if (!parsed.success) {
          console.warn("Invalid WS message:", parsed.error.issues);
          return;
        }
        message = parsed.data;
      } catch {
        console.warn("Failed to parse WS message");
        return;
      }

      const listeners = this.channels.get(message.channel);
      if (!listeners) {
        return;
      }
      for (const listener of listeners) {
        listener(message);
      }
    });

    this.socket.addEventListener("close", () => {
      this.socket = null;
      if (this.manuallyClosed) {
        return;
      }
      this.scheduleReconnect();
    });

    this.socket.addEventListener("error", () => {
      this.socket?.close();
    });
  }

  private scheduleReconnect() {
    if (this.channels.size === 0 || this.reconnectTimer !== null) {
      return;
    }

    const base = Math.min(1000 * 2 ** this.reconnectAttempt, 30_000);
    const jitter = (this.reconnectAttempt * 73) % 500;
    const delay = base + jitter;
    this.reconnectAttempt += 1;

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private close() {
    this.manuallyClosed = true;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
    this.reconnectAttempt = 0;
  }

  disconnect() {
    this.channels.clear();
    this.close();
  }
}

export const wsClient = new WsClient();
