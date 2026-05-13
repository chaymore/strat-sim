import Fastify from "fastify";
import {
  buildObservation,
  createGame,
  resolveTurn,
  submitDecision,
  allDecisionsIn,
} from "@strat-sim/sim";
import type { GameState, MatchConfig, TurnDecision } from "@strat-sim/shared";

// In-memory match store for v0.1. Swap for Postgres later.
const matches = new Map<string, GameState>();

const app = Fastify({ logger: true });

app.get("/health", async () => ({ ok: true }));

app.post<{ Body: Partial<MatchConfig> }>("/matches", async (req, reply) => {
  const body = req.body;
  if (!body?.matchId || !Array.isArray(body.companies)) {
    return reply.code(400).send({ error: "matchId and companies required" });
  }
  const cfg: MatchConfig = {
    matchId: body.matchId,
    seed: body.seed ?? Math.floor(Math.random() * 1e9),
    numConsumers: body.numConsumers ?? 250,
    maxTurns: body.maxTurns ?? 10,
    marketCapWinThreshold: body.marketCapWinThreshold ?? 50_000_000,
    companies: body.companies,
  };
  const game = createGame(cfg);
  matches.set(cfg.matchId, game);
  return { matchId: cfg.matchId, phase: game.phase };
});

app.get<{ Params: { matchId: string; companyId: string } }>(
  "/matches/:matchId/observe/:companyId",
  async (req, reply) => {
    const game = matches.get(req.params.matchId);
    if (!game) return reply.code(404).send({ error: "no such match" });
    return buildObservation(game, req.params.companyId);
  },
);

app.post<{ Params: { matchId: string }; Body: TurnDecision }>(
  "/matches/:matchId/act",
  async (req, reply) => {
    const game = matches.get(req.params.matchId);
    if (!game) return reply.code(404).send({ error: "no such match" });
    if (game.phase !== "decision") {
      return reply.code(409).send({ error: `match phase is ${game.phase}` });
    }
    submitDecision(game, req.body);
    let resolved = false;
    if (allDecisionsIn(game)) {
      resolveTurn(game);
      resolved = true;
    }
    return { accepted: true, resolved, phase: game.phase };
  },
);

const port = Number(process.env.PORT ?? 3001);
app
  .listen({ port, host: "0.0.0.0" })
  .then(() => app.log.info(`strat-sim server listening on :${port}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
