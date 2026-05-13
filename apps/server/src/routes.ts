import type { FastifyInstance } from "fastify";
import {
  classroomToPublic,
  createClass,
  createMatch,
  getClass,
  getMatch,
  getMatchByCode,
  joinMatch,
  matchToAudit,
  startMatch,
  toLobbyState,
  type Classroom,
} from "./registry.js";

function requireInstructor(token: string | undefined, classroom: Classroom): boolean {
  return token != null && token === classroom.instructorToken;
}

export async function registerRestRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({ ok: true, ts: Date.now() }));

  // ---- Classroom ----
  app.post<{ Body: { name?: string } }>("/classes", async (req) => {
    const { classroom, instructorToken } = createClass(req.body?.name ?? "");
    return {
      classCode: classroom.code,
      name: classroom.name,
      instructorToken,
    };
  });

  app.get<{ Params: { code: string } }>("/classes/:code", async (req, reply) => {
    const c = getClass(req.params.code.toUpperCase());
    if (!c) return reply.code(404).send({ error: "class not found" });
    return classroomToPublic(c);
  });

  app.get<{ Params: { code: string }; Headers: { authorization?: string } }>(
    "/classes/:code/dashboard",
    async (req, reply) => {
      const c = getClass(req.params.code.toUpperCase());
      if (!c) return reply.code(404).send({ error: "class not found" });
      const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
      if (!requireInstructor(token, c)) return reply.code(403).send({ error: "instructor token required" });
      const audits = c.matchIds.map((id) => getMatch(id)).filter((m) => m).map((m) => matchToAudit(m!));
      return { class: classroomToPublic(c), matches: audits };
    },
  );

  // ---- Match lifecycle ----
  app.post<{
    Params: { code: string };
    Body: { seatCount?: number };
    Headers: { authorization?: string };
  }>("/classes/:code/matches", async (req, reply) => {
    const c = getClass(req.params.code.toUpperCase());
    if (!c) return reply.code(404).send({ error: "class not found" });
    const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
    if (!requireInstructor(token, c)) return reply.code(403).send({ error: "instructor token required" });
    const seats = Math.max(2, Math.min(4, req.body?.seatCount ?? 4));
    const match = createMatch(c.code, seats);
    return { matchId: match.matchId, matchCode: match.matchCode, seatCount: match.seatCount };
  });

  app.post<{
    Params: { matchCode: string };
    Body: { name: string };
  }>("/matches/:matchCode/join", async (req, reply) => {
    try {
      const { player, match } = joinMatch(req.params.matchCode.toUpperCase(), req.body?.name ?? "");
      return {
        playerId: player.playerId,
        playerToken: player.token,
        companyId: player.companyId,
        matchId: match.matchId,
        lobby: toLobbyState(match),
      };
    } catch (e) {
      return reply.code(400).send({ error: (e as Error).message });
    }
  });

  app.get<{ Params: { matchCode: string } }>("/matches/:matchCode/lobby", async (req, reply) => {
    const match = getMatchByCode(req.params.matchCode.toUpperCase());
    if (!match) return reply.code(404).send({ error: "match not found" });
    return toLobbyState(match);
  });

  /**
   * Instructor-only: force-start a match (filling empty seats with bots).
   * Lets seed scripts and LLM-only flows skip the manual lobby step.
   */
  app.post<{
    Params: { matchCode: string };
    Headers: { authorization?: string };
  }>("/matches/:matchCode/start", async (req, reply) => {
    const match = getMatchByCode(req.params.matchCode.toUpperCase());
    if (!match) return reply.code(404).send({ error: "match not found" });
    const classroom = getClass(match.classCode);
    if (!classroom) return reply.code(404).send({ error: "class not found" });
    const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
    if (!requireInstructor(token, classroom)) {
      return reply.code(403).send({ error: "instructor token required" });
    }
    try {
      startMatch(match, true);
    } catch (e) {
      return reply.code(400).send({ error: (e as Error).message });
    }
    return { matchId: match.matchId, lobby: toLobbyState(match) };
  });
}
