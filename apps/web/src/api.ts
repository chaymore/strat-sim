import type { LobbyState, MatchAudit, PublicClassroom } from "@strat-sim/shared";

const DEFAULT_BASE =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:3001"
    : "";

const SERVER_BASE = (import.meta.env.VITE_SERVER_BASE ?? DEFAULT_BASE) as string;

export function wsBase(): string {
  if (SERVER_BASE) return SERVER_BASE.replace(/^http/, "ws");
  return window.location.origin.replace(/^http/, "ws");
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${SERVER_BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let msg = `${res.status}`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) msg = j.error;
    } catch { /* */ }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export function createClass(name: string) {
  return req<{ classCode: string; name: string; instructorToken: string }>(
    "/classes",
    { method: "POST", body: JSON.stringify({ name }) },
  );
}

export function getClass(code: string) {
  return req<PublicClassroom>(`/classes/${code.toUpperCase()}`);
}

export function getDashboard(code: string, instructorToken: string) {
  return req<{ class: PublicClassroom; matches: MatchAudit[] }>(
    `/classes/${code.toUpperCase()}/dashboard`,
    { headers: { authorization: `Bearer ${instructorToken}` } },
  );
}

export function createMatch(classCode: string, instructorToken: string, seatCount = 4) {
  return req<{ matchId: string; matchCode: string; seatCount: number }>(
    `/classes/${classCode.toUpperCase()}/matches`,
    {
      method: "POST",
      body: JSON.stringify({ seatCount }),
      headers: { authorization: `Bearer ${instructorToken}` },
    },
  );
}

export function joinMatch(matchCode: string, name: string) {
  return req<{
    playerId: string;
    playerToken: string;
    companyId: string;
    matchId: string;
    lobby: LobbyState;
  }>(`/matches/${matchCode.toUpperCase()}/join`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function getLobby(matchCode: string) {
  return req<LobbyState>(`/matches/${matchCode.toUpperCase()}/lobby`);
}

export function seatLlm(matchCode: string, instructorToken: string, name: string) {
  return req<{
    playerId: string;
    apiToken: string;
    companyId: string;
    matchId: string;
  }>(`/api/llm/matches/${matchCode.toUpperCase()}/seat`, {
    method: "POST",
    body: JSON.stringify({ name }),
    headers: { authorization: `Bearer ${instructorToken}` },
  });
}
