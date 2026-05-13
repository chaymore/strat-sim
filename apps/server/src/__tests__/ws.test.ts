import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { WebSocket } from "ws";
import { buildApp } from "../index.js";
import { _resetAll } from "../registry.js";
import type {
  ClientMessage,
  LobbyState,
  ObservationView,
  ServerMessage,
  TurnDecision,
} from "@strat-sim/shared";

let app: FastifyInstance;
let baseUrl: string;
let wsBase: string;

beforeAll(async () => {
  app = await buildApp();
  await app.listen({ port: 0, host: "127.0.0.1" });
  const addr = app.server.address();
  if (!addr || typeof addr === "string") throw new Error("no address");
  baseUrl = `http://127.0.0.1:${addr.port}`;
  wsBase = `ws://127.0.0.1:${addr.port}`;
});
afterAll(async () => {
  await app.close();
});
beforeEach(() => _resetAll());

async function post<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

function connectAndHello(matchId: string, token: string) {
  const ws = new WebSocket(`${wsBase}/ws/match/${matchId}`);
  const incoming: ServerMessage[] = [];
  ws.on("message", (data) => incoming.push(JSON.parse(data.toString()) as ServerMessage));
  return new Promise<{ ws: WebSocket; incoming: ServerMessage[] }>((resolve) => {
    ws.on("open", () => {
      ws.send(JSON.stringify({ type: "hello", token } as ClientMessage));
      resolve({ ws, incoming });
    });
  });
}

function send(ws: WebSocket, msg: ClientMessage) {
  ws.send(JSON.stringify(msg));
}

function defaultDecision(companyId: string): TurnDecision {
  return {
    companyId,
    price: 300,
    subscriptionPrice: 0,
    rd: { privacy: 1, capability: 1, design: 1, wellness: 1 },
    marketing: { total: 10_000, segmentTarget: "broad" },
    capacityInvestment: 5,
  };
}

async function waitFor<T extends ServerMessage["type"]>(
  bag: ServerMessage[],
  type: T,
  timeoutMs = 1500,
): Promise<Extract<ServerMessage, { type: T }>> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const m = bag.find((x) => x.type === type) as Extract<ServerMessage, { type: T }> | undefined;
    if (m) return m;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error(`timeout waiting for ${type}; got ${bag.map((m) => m.type).join(",")}`);
}

describe("WebSocket protocol", () => {
  it("runs a 2-human + 2-bot match end to end", async () => {
    const cls = await post<{ classCode: string; instructorToken: string }>("/classes", { name: "T" });
    const match = await post<{ matchId: string; matchCode: string }>(
      `/classes/${cls.classCode}/matches`,
      { seatCount: 4 },
      cls.instructorToken,
    );
    const j1 = await post<{ playerToken: string; companyId: string; playerId: string }>(
      `/matches/${match.matchCode}/join`,
      { name: "Alice" },
    );
    const j2 = await post<{ playerToken: string; companyId: string; playerId: string }>(
      `/matches/${match.matchCode}/join`,
      { name: "Bob" },
    );

    const a = await connectAndHello(match.matchId, j1.playerToken);
    const b = await connectAndHello(match.matchId, j2.playerToken);

    // First lobby messages arrive
    const lobby = (await waitFor(a.incoming, "lobby")) as { type: "lobby"; lobby: LobbyState };
    expect(lobby.lobby.players.length).toBe(2);

    // Host (Alice) starts the match
    send(a.ws, { type: "start-match" });

    const obsA = await waitFor(a.incoming, "observation");
    const obsB = await waitFor(b.incoming, "observation");
    expect(obsA.observation.turn).toBe(0);
    expect(obsB.observation.turn).toBe(0);

    // Submit decisions from both humans → bots fill in, turn resolves
    send(a.ws, { type: "submit-decision", decision: defaultDecision(j1.companyId) });
    send(b.ws, { type: "submit-decision", decision: defaultDecision(j2.companyId) });

    const resolved = await waitFor(a.incoming, "turn-resolved");
    expect(resolved.turn).toBe(1);

    a.ws.close();
    b.ws.close();
    await new Promise((r) => setTimeout(r, 100));
  });

  it("rejects start-match from a non-host", async () => {
    const cls = await post<{ classCode: string; instructorToken: string }>("/classes", {});
    const match = await post<{ matchId: string; matchCode: string }>(
      `/classes/${cls.classCode}/matches`,
      { seatCount: 4 },
      cls.instructorToken,
    );
    const j1 = await post<{ playerToken: string }>(`/matches/${match.matchCode}/join`, { name: "A" });
    const j2 = await post<{ playerToken: string }>(`/matches/${match.matchCode}/join`, { name: "B" });

    const a = await connectAndHello(match.matchId, j1.playerToken);
    const b = await connectAndHello(match.matchId, j2.playerToken);
    await waitFor(a.incoming, "lobby");
    await waitFor(b.incoming, "lobby");

    send(b.ws, { type: "start-match" });
    const err = await waitFor(b.incoming, "error");
    expect(err.message).toContain("only host");
    a.ws.close();
    b.ws.close();
    await new Promise((r) => setTimeout(r, 100));
  });
});

function _typecheck(_o: ObservationView) {}
_typecheck;
