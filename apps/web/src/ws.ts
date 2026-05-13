import type { ClientMessage, ServerMessage } from "@strat-sim/shared";
import { wsBase } from "./api.js";

export type ServerMessageHandler = (msg: ServerMessage) => void;

export class MatchSocket {
  private ws: WebSocket | null = null;
  private handlers = new Set<ServerMessageHandler>();
  private pendingSends: ClientMessage[] = [];
  private closed = false;

  constructor(
    private readonly matchId: string,
    private readonly token: string,
  ) {}

  open() {
    if (this.ws || this.closed) return;
    const url = `${wsBase()}/ws/match/${this.matchId}`;
    const ws = new WebSocket(url);
    this.ws = ws;
    ws.addEventListener("open", () => {
      this.send({ type: "hello", token: this.token });
      for (const m of this.pendingSends.splice(0)) this.send(m);
    });
    ws.addEventListener("message", (e) => {
      try {
        const msg = JSON.parse(e.data as string) as ServerMessage;
        for (const h of this.handlers) h(msg);
      } catch { /* */ }
    });
    ws.addEventListener("close", () => {
      this.ws = null;
      if (!this.closed) {
        setTimeout(() => this.open(), 800);
      }
    });
  }

  on(h: ServerMessageHandler): () => void {
    this.handlers.add(h);
    return () => this.handlers.delete(h);
  }

  send(msg: ClientMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      this.pendingSends.push(msg);
    }
  }

  close() {
    this.closed = true;
    this.ws?.close();
    this.ws = null;
    this.handlers.clear();
  }
}
