import type { FastifyInstance } from "fastify";
import type { TurnDecision } from "@strat-sim/shared";
import {
  awaitingCompanyIds,
  findPlayerByToken,
  getClass,
  getMatch,
  getMatchByCode,
  joinMatch,
  observationFor,
  submitPlayerDecision,
  toLobbyState,
} from "./registry.js";

function bearer(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const m = /^Bearer\s+(.+)$/i.exec(authHeader);
  return m ? m[1]! : null;
}

export async function registerLlmRoutes(app: FastifyInstance) {
  /**
   * Mint an AI player slot in an existing lobby. Returns the bearer token the
   * agent should use on all subsequent /api/llm calls. Requires the
   * instructor token of the class that owns the match.
   */
  app.post<{
    Params: { matchCode: string };
    Body: { name?: string };
    Headers: { authorization?: string };
  }>("/api/llm/matches/:matchCode/seat", async (req, reply) => {
    const matchCode = req.params.matchCode.toUpperCase();
    const match = getMatchByCode(matchCode);
    if (!match) return reply.code(404).send({ error: "match not found" });
    const classroom = getClass(match.classCode);
    if (!classroom) return reply.code(404).send({ error: "class not found" });
    const token = bearer(req.headers.authorization);
    if (token !== classroom.instructorToken) {
      return reply.code(403).send({ error: "instructor token required" });
    }
    const { player } = joinMatch(matchCode, req.body?.name ?? "AI Agent", "ai");
    return {
      playerId: player.playerId,
      apiToken: player.token,
      companyId: player.companyId,
      matchId: match.matchId,
      lobby: toLobbyState(match),
    };
  });

  app.get<{
    Params: { matchId: string };
    Headers: { authorization?: string };
  }>("/api/llm/matches/:matchId/observe", async (req, reply) => {
    const match = getMatch(req.params.matchId);
    if (!match) return reply.code(404).send({ error: "match not found" });
    const token = bearer(req.headers.authorization);
    if (!token) return reply.code(401).send({ error: "Bearer token required" });
    const player = findPlayerByToken(match, token);
    if (!player) return reply.code(403).send({ error: "bad token" });
    if (!match.game) return reply.code(409).send({ error: "match not started" });
    return {
      observation: observationFor(match, player),
      awaitingCompanyIds: awaitingCompanyIds(match),
    };
  });

  app.post<{
    Params: { matchId: string };
    Body: TurnDecision;
    Headers: { authorization?: string };
  }>("/api/llm/matches/:matchId/act", async (req, reply) => {
    const match = getMatch(req.params.matchId);
    if (!match) return reply.code(404).send({ error: "match not found" });
    const token = bearer(req.headers.authorization);
    if (!token) return reply.code(401).send({ error: "Bearer token required" });
    const player = findPlayerByToken(match, token);
    if (!player) return reply.code(403).send({ error: "bad token" });
    if (!match.game) return reply.code(409).send({ error: "match not started" });
    const result = submitPlayerDecision(match, player.playerId, req.body);
    return {
      accepted: true,
      resolved: result.resolved,
      phase: match.game.phase,
      turn: match.game.turn,
    };
  });
}
