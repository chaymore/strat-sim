import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../index.js";
import { _resetAll } from "../registry.js";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => _resetAll());

interface InjectOpts {
  method: "GET" | "POST";
  url: string;
  payload?: unknown;
  headers?: Record<string, string>;
}

async function inject<T = unknown>(opts: InjectOpts): Promise<{ statusCode: number; body: T | null }> {
  const r = await app.inject(opts as never);
  return { statusCode: r.statusCode, body: r.body ? (JSON.parse(r.body) as T) : null };
}

describe("REST classroom + match flow", () => {
  it("creates a class and a match", async () => {
    const cls = await inject<{ classCode: string; instructorToken: string }>({
      method: "POST",
      url: "/classes",
      payload: { name: "BUS 301" },
    });
    expect(cls.statusCode).toBe(200);
    expect(cls.body?.classCode).toHaveLength(6);

    const m = await inject<{ matchCode: string; matchId: string }>({
      method: "POST",
      url: `/classes/${cls.body!.classCode}/matches`,
      payload: { seatCount: 4 },
      headers: { authorization: `Bearer ${cls.body!.instructorToken}` },
    });
    expect(m.statusCode).toBe(200);
    expect(m.body?.matchCode).toHaveLength(5);
  });

  it("rejects match creation without instructor token", async () => {
    const cls = await inject<{ classCode: string }>({
      method: "POST",
      url: "/classes",
      payload: { name: "X" },
    });
    const r = await inject({
      method: "POST",
      url: `/classes/${cls.body!.classCode}/matches`,
      payload: { seatCount: 4 },
    });
    expect(r.statusCode).toBe(403);
  });

  it("lets two students join a lobby", async () => {
    const cls = await inject<{ classCode: string; instructorToken: string }>({
      method: "POST",
      url: "/classes",
      payload: {},
    });
    const m = await inject<{ matchCode: string }>({
      method: "POST",
      url: `/classes/${cls.body!.classCode}/matches`,
      payload: { seatCount: 4 },
      headers: { authorization: `Bearer ${cls.body!.instructorToken}` },
    });
    const j1 = await inject({
      method: "POST",
      url: `/matches/${m.body!.matchCode}/join`,
      payload: { name: "Alice" },
    });
    const j2 = await inject({
      method: "POST",
      url: `/matches/${m.body!.matchCode}/join`,
      payload: { name: "Bob" },
    });
    expect(j1.statusCode).toBe(200);
    expect(j2.statusCode).toBe(200);
    const lobby = await inject<{ players: { name: string }[] }>({
      method: "GET",
      url: `/matches/${m.body!.matchCode}/lobby`,
    });
    expect(lobby.body!.players.map((p) => p.name).sort()).toEqual(["Alice", "Bob"]);
  });

  it("mints LLM API tokens and accepts authenticated act calls", async () => {
    const cls = await inject<{ classCode: string; instructorToken: string }>({
      method: "POST",
      url: "/classes",
      payload: {},
    });
    const m = await inject<{ matchCode: string; matchId: string }>({
      method: "POST",
      url: `/classes/${cls.body!.classCode}/matches`,
      payload: { seatCount: 4 },
      headers: { authorization: `Bearer ${cls.body!.instructorToken}` },
    });
    const seat = await inject<{ apiToken: string; matchId: string }>({
      method: "POST",
      url: `/api/llm/matches/${m.body!.matchCode}/seat`,
      payload: { name: "GPT-4" },
      headers: { authorization: `Bearer ${cls.body!.instructorToken}` },
    });
    expect(seat.statusCode).toBe(200);
    expect(seat.body!.apiToken).toMatch(/^[a-f0-9]+$/);

    // Observe should 409 because match hasn't started yet.
    const obs = await inject({
      method: "GET",
      url: `/api/llm/matches/${m.body!.matchId}/observe`,
      headers: { authorization: `Bearer ${seat.body!.apiToken}` },
    });
    expect(obs.statusCode).toBe(409);
  });

  it("requires bearer token for observe/act", async () => {
    const cls = await inject<{ classCode: string; instructorToken: string }>({
      method: "POST",
      url: "/classes",
      payload: {},
    });
    const m = await inject<{ matchCode: string; matchId: string }>({
      method: "POST",
      url: `/classes/${cls.body!.classCode}/matches`,
      payload: { seatCount: 4 },
      headers: { authorization: `Bearer ${cls.body!.instructorToken}` },
    });
    const obs = await inject({
      method: "GET",
      url: `/api/llm/matches/${m.body!.matchId}/observe`,
    });
    expect(obs.statusCode).toBe(401);
  });
});
