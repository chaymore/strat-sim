import type { FastifyInstance } from "fastify";
import type { WebSocket } from "@fastify/websocket";
import type {
  ClientMessage,
  PlayerId,
  ServerMessage,
} from "@strat-sim/shared";
import {
  awaitingPlayers,
  findPlayerByToken,
  getMatch,
  observationFor,
  setConnected,
  setReady,
  startMatch,
  submitPlayerDecision,
  toLobbyState,
} from "./registry.js";

interface ClientCtx {
  socket: WebSocket;
  matchId: string;
  playerId: PlayerId;
}

// matchId -> set of connected clients
const connections = new Map<string, Set<ClientCtx>>();

export async function registerWebsocketRoutes(app: FastifyInstance) {
  app.get<{ Params: { matchId: string } }>(
    "/ws/match/:matchId",
    { websocket: true },
    (socket, req) => {
      const matchId = (req.params as { matchId: string }).matchId;
      const match = getMatch(matchId);
      if (!match) {
        sendMessage(socket, { type: "error", message: "match not found" });
        socket.close();
        return;
      }

      let ctx: ClientCtx | null = null;

      socket.on("message", (raw: Buffer) => {
        let msg: ClientMessage;
        try {
          msg = JSON.parse(raw.toString()) as ClientMessage;
        } catch {
          sendMessage(socket, { type: "error", message: "invalid JSON" });
          return;
        }
        try {
          handleClientMessage(socket, matchId, msg, (c) => (ctx = c));
        } catch (e) {
          sendMessage(socket, { type: "error", message: (e as Error).message });
        }
      });

      socket.on("close", () => {
        if (!ctx) return;
        const pool = connections.get(ctx.matchId);
        if (pool) {
          pool.delete(ctx);
          if (pool.size === 0) connections.delete(ctx.matchId);
        }
        const m = getMatch(ctx.matchId);
        if (m) {
          setConnected(m, ctx.playerId, false);
          broadcastLobby(ctx.matchId);
        }
      });
    },
  );
}

function handleClientMessage(
  socket: WebSocket,
  matchId: string,
  msg: ClientMessage,
  setCtx: (ctx: ClientCtx) => void,
) {
  const match = getMatch(matchId);
  if (!match) {
    sendMessage(socket, { type: "error", message: "match not found" });
    return;
  }

  switch (msg.type) {
    case "hello": {
      const player = findPlayerByToken(match, msg.token);
      if (!player) {
        sendMessage(socket, { type: "error", message: "bad token" });
        return;
      }
      const ctx: ClientCtx = { socket, matchId, playerId: player.playerId };
      setCtx(ctx);
      const pool = connections.get(matchId) ?? new Set<ClientCtx>();
      pool.add(ctx);
      connections.set(matchId, pool);
      setConnected(match, player.playerId, true);
      broadcastLobby(matchId);
      if (match.game) {
        // Already started — send observation immediately.
        sendMessage(socket, {
          type: "observation",
          observation: observationFor(match, player),
          awaitingPlayers: awaitingPlayers(match),
        });
      }
      return;
    }
    case "set-ready": {
      const player = playerFromSocket(matchId, socket);
      if (!player) return;
      setReady(match, player.playerId, msg.ready);
      broadcastLobby(matchId);
      return;
    }
    case "start-match": {
      const player = playerFromSocket(matchId, socket);
      if (!player) return;
      if (match.hostPlayerId !== player.playerId) {
        sendMessage(socket, { type: "error", message: "only host can start" });
        return;
      }
      startMatch(match, true);
      broadcastLobby(matchId);
      broadcastObservations(matchId);
      return;
    }
    case "submit-decision": {
      const player = playerFromSocket(matchId, socket);
      if (!player) return;
      const result = submitPlayerDecision(match, player.playerId, msg.decision);
      if (result.resolved) {
        broadcastResolution(matchId);
      } else {
        broadcastObservations(matchId);
      }
      return;
    }
  }
}

function playerFromSocket(matchId: string, socket: WebSocket) {
  const pool = connections.get(matchId);
  if (!pool) return null;
  for (const c of pool) {
    if (c.socket === socket) {
      const match = getMatch(matchId);
      return match?.players.find((p) => p.playerId === c.playerId) ?? null;
    }
  }
  return null;
}

function broadcastLobby(matchId: string) {
  const match = getMatch(matchId);
  if (!match) return;
  const pool = connections.get(matchId);
  if (!pool) return;
  const msg: ServerMessage = { type: "lobby", lobby: toLobbyState(match) };
  for (const c of pool) sendMessage(c.socket, msg);
}

function broadcastObservations(matchId: string) {
  const match = getMatch(matchId);
  if (!match?.game) return;
  const pool = connections.get(matchId);
  if (!pool) return;
  const awaiting = awaitingPlayers(match);
  for (const c of pool) {
    const player = match.players.find((p) => p.playerId === c.playerId);
    if (!player) continue;
    sendMessage(c.socket, {
      type: "observation",
      observation: observationFor(match, player),
      awaitingPlayers: awaiting,
    });
  }
}

function broadcastResolution(matchId: string) {
  const match = getMatch(matchId);
  if (!match?.game) return;
  const pool = connections.get(matchId);
  if (!pool) return;
  const turn = match.game.turn;
  for (const c of pool) {
    const player = match.players.find((p) => p.playerId === c.playerId);
    if (!player) continue;
    const obs = observationFor(match, player);
    sendMessage(c.socket, { type: "turn-resolved", turn, observation: obs });
    if (match.game.phase === "ended") {
      const winnerName = match.game.winnerId
        ? match.players.find((p) => p.companyId === match.game!.winnerId)?.name ?? null
        : null;
      sendMessage(c.socket, { type: "match-ended", observation: obs, winnerName });
    }
  }
}

function sendMessage(socket: WebSocket, msg: ServerMessage) {
  if (socket.readyState !== 1) return; // OPEN === 1
  socket.send(JSON.stringify(msg));
}
