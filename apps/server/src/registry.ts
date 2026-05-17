import { randomBytes } from "node:crypto";
import {
  buildObservation,
  createGame,
  resolveTurn,
  submitDecision,
} from "@strat-sim/sim";
import {
  appleBot,
  costcoBot,
  randomBot,
  whoopBot,
} from "@strat-sim/sim/bots";
import type {
  ClassCode,
  CompanyId,
  GameState,
  LobbyPlayer,
  LobbyState,
  MatchAudit,
  MatchCode,
  MatchId,
  ObservationView,
  PlayerId,
  PlayerToken,
  PublicClassroom,
  Role,
  TurnAudit,
  TurnDecision,
} from "@strat-sim/shared";

const SEAT_COMPANY_IDS: CompanyId[] = ["p1", "p2", "p3", "p4"];
const SEAT_COMPANY_NAMES = ["BlueWave", "Solstice", "Halo", "Pulse"];
const SEAT_BOTS = [costcoBot, appleBot, whoopBot, randomBot] as const;

const CLASS_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no easily-confused chars

export function shortCode(len = 6): string {
  let out = "";
  const buf = randomBytes(len);
  for (let i = 0; i < len; i++) {
    out += CLASS_CODE_CHARS[buf[i]! % CLASS_CODE_CHARS.length];
  }
  return out;
}

export function uuid(): string {
  return randomBytes(12).toString("hex");
}

export interface Classroom {
  code: ClassCode;
  name: string;
  instructorToken: PlayerToken;
  createdAt: number;
  matchIds: MatchId[];
}

export interface ServerPlayer {
  playerId: PlayerId;
  token: PlayerToken;
  name: string;
  role: Role;
  companyId: CompanyId;
  ready: boolean;
  connected: boolean;
  isBot: boolean;
}

export interface ServerMatch {
  matchId: MatchId;
  matchCode: MatchCode;
  classCode: ClassCode;
  seatCount: number;
  players: ServerPlayer[];
  hostPlayerId: PlayerId | null;
  game: GameState | null;
  audit: TurnAudit[];
  createdAt: number;
  endedAt: number | null;
}

const classes = new Map<ClassCode, Classroom>();
const matches = new Map<MatchId, ServerMatch>();
const matchesByCode = new Map<MatchCode, MatchId>();

export function createClass(name: string): { classroom: Classroom; instructorToken: PlayerToken } {
  let code = shortCode();
  while (classes.has(code)) code = shortCode();
  const instructorToken = uuid();
  const classroom: Classroom = {
    code,
    name: name || "Untitled class",
    instructorToken,
    createdAt: Date.now(),
    matchIds: [],
  };
  classes.set(code, classroom);
  return { classroom, instructorToken };
}

export function getClass(code: ClassCode): Classroom | undefined {
  return classes.get(code);
}

export function listClasses(): Classroom[] {
  return [...classes.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export function createMatch(
  classCode: ClassCode,
  seatCount: number,
): ServerMatch {
  const classroom = classes.get(classCode);
  if (!classroom) throw new Error("class not found");
  const matchId = uuid();
  let matchCode = shortCode(5);
  while (matchesByCode.has(matchCode)) matchCode = shortCode(5);
  const match: ServerMatch = {
    matchId,
    matchCode,
    classCode,
    seatCount,
    players: [],
    hostPlayerId: null,
    game: null,
    audit: [],
    createdAt: Date.now(),
    endedAt: null,
  };
  matches.set(matchId, match);
  matchesByCode.set(matchCode, matchId);
  classroom.matchIds.push(matchId);
  return match;
}

export function getMatch(matchId: MatchId): ServerMatch | undefined {
  return matches.get(matchId);
}

export function getMatchByCode(matchCode: MatchCode): ServerMatch | undefined {
  const id = matchesByCode.get(matchCode);
  return id ? matches.get(id) : undefined;
}

export interface JoinResult {
  player: ServerPlayer;
  match: ServerMatch;
}

export function joinMatch(
  matchCode: MatchCode,
  name: string,
  role: Role = "student",
): JoinResult {
  const match = getMatchByCode(matchCode);
  if (!match) throw new Error("match not found");
  if (match.game) throw new Error("match already started");
  if (match.players.filter((p) => !p.isBot).length >= match.seatCount) {
    throw new Error("match is full");
  }
  const takenSeats = new Set(match.players.map((p) => p.companyId));
  const companyId = SEAT_COMPANY_IDS.find((id) => !takenSeats.has(id));
  if (!companyId) throw new Error("no seat available");
  const player: ServerPlayer = {
    playerId: uuid(),
    token: uuid(),
    name: name.trim() || `Player ${match.players.length + 1}`,
    role,
    companyId,
    ready: false,
    connected: false,
    isBot: false,
  };
  match.players.push(player);
  if (!match.hostPlayerId) match.hostPlayerId = player.playerId;
  return { player, match };
}

export function findPlayerByToken(
  match: ServerMatch,
  token: PlayerToken,
): ServerPlayer | undefined {
  return match.players.find((p) => p.token === token);
}

export function setReady(match: ServerMatch, playerId: PlayerId, ready: boolean): void {
  const p = match.players.find((x) => x.playerId === playerId);
  if (p) p.ready = ready;
}

export function setConnected(
  match: ServerMatch,
  playerId: PlayerId,
  connected: boolean,
): void {
  const p = match.players.find((x) => x.playerId === playerId);
  if (p) p.connected = connected;
}

export function startMatch(match: ServerMatch, withBotFill = true): void {
  if (match.game) return;
  if (withBotFill) fillEmptySeatsWithBots(match);
  if (match.players.length < 2) throw new Error("need at least 2 players");
  const seed = Math.floor(Math.random() * 1e9);
  match.game = createGame({
    matchId: match.matchId,
    seed,
    numConsumers: 250,
    maxTurns: 10,
    marketCapWinThreshold: 50_000_000,
    companies: match.players.map((p) => ({ id: p.companyId, name: p.name })),
  });
}

function fillEmptySeatsWithBots(match: ServerMatch): void {
  const taken = new Set(match.players.map((p) => p.companyId));
  let botIdx = 0;
  for (const seat of SEAT_COMPANY_IDS) {
    if (taken.has(seat)) continue;
    const botName = `Bot ${SEAT_COMPANY_NAMES[botIdx % SEAT_COMPANY_NAMES.length]}`;
    match.players.push({
      playerId: uuid(),
      token: uuid(),
      name: botName,
      role: "bot",
      companyId: seat,
      ready: true,
      connected: true,
      isBot: true,
    });
    botIdx++;
    if (match.players.length >= match.seatCount) break;
  }
}

export function submitPlayerDecision(
  match: ServerMatch,
  playerId: PlayerId,
  decision: TurnDecision,
): { resolved: boolean } {
  if (!match.game) throw new Error("match not started");
  const player = match.players.find((p) => p.playerId === playerId);
  if (!player) throw new Error("unknown player");
  if (match.game.phase !== "decision") throw new Error("match not awaiting decisions");
  submitDecision(match.game, { ...decision, companyId: player.companyId });
  return collectBotsAndMaybeResolve(match);
}

function collectBotsAndMaybeResolve(match: ServerMatch): { resolved: boolean } {
  if (!match.game) return { resolved: false };
  const humans = match.players.filter((p) => !p.isBot);
  const bots = match.players.filter((p) => p.isBot);

  const decisionsIn = humans.every(
    (p) => match.game!.pendingDecisions[p.companyId] != null,
  );
  if (!decisionsIn) return { resolved: false };

  // All humans submitted; now ask bots.
  bots.forEach((bot, i) => {
    if (match.game!.pendingDecisions[bot.companyId] != null) return;
    const view = buildObservation(match.game!, bot.companyId);
    const botFn = SEAT_BOTS[i % SEAT_BOTS.length]!;
    submitDecision(match.game!, botFn(view));
  });

  // Capture audit entry, resolve, advance.
  const turn = match.game.turn + 1;
  const decisionsByPlayer: Record<PlayerId, TurnDecision> = {};
  for (const p of match.players) {
    const dec = match.game.pendingDecisions[p.companyId];
    if (dec) decisionsByPlayer[p.playerId] = dec;
  }
  resolveTurn(match.game);
  match.audit.push({
    turn,
    decisions: decisionsByPlayer,
    resolvedAt: Date.now(),
  });
  if (match.game.phase === "ended") match.endedAt = Date.now();
  return { resolved: true };
}

export function toLobbyState(match: ServerMatch): LobbyState {
  return {
    matchId: match.matchId,
    matchCode: match.matchCode,
    classCode: match.classCode,
    status: match.game
      ? match.game.phase === "ended"
        ? "ended"
        : "playing"
      : "lobby",
    seatCount: match.seatCount,
    hostPlayerId: match.hostPlayerId,
    players: match.players.map(serverPlayerToLobby),
    startedAt: match.game ? match.createdAt : null,
  };
}

function serverPlayerToLobby(p: ServerPlayer): LobbyPlayer {
  return {
    playerId: p.playerId,
    name: p.name,
    role: p.role,
    companyId: p.companyId,
    ready: p.ready,
    connected: p.connected,
    isBot: p.isBot,
  };
}

export function observationFor(
  match: ServerMatch,
  player: ServerPlayer,
): ObservationView {
  if (!match.game) throw new Error("match not started");
  return buildObservation(match.game, player.companyId);
}

export function awaitingCompanyIds(match: ServerMatch): CompanyId[] {
  if (!match.game) return [];
  return match.players
    .filter((p) => !p.isBot && match.game!.pendingDecisions[p.companyId] == null)
    .map((p) => p.companyId);
}

export function classroomToPublic(c: Classroom): PublicClassroom {
  return {
    code: c.code,
    name: c.name,
    createdAt: c.createdAt,
    matchSummaries: c.matchIds
      .map((id) => matches.get(id))
      .filter((m): m is ServerMatch => !!m)
      .map((m) => ({
        matchId: m.matchId,
        matchCode: m.matchCode,
        status: m.game ? (m.game.phase === "ended" ? "ended" : "playing") : "lobby",
        turn: m.game?.turn ?? 0,
        maxTurns: m.game?.config.maxTurns ?? 10,
        playerCount: m.players.filter((p) => !p.isBot).length,
        seatCount: m.seatCount,
        createdAt: m.createdAt,
        endedAt: m.endedAt,
        winnerName: m.game?.winnerId
          ? m.players.find((p) => p.companyId === m.game!.winnerId)?.name ?? null
          : null,
      })),
  };
}

export function matchToAudit(match: ServerMatch): MatchAudit {
  const finalObservationByCompany: Record<CompanyId, ObservationView> = {};
  if (match.game) {
    for (const p of match.players) {
      finalObservationByCompany[p.companyId] = buildObservation(match.game, p.companyId);
    }
  }
  return {
    matchId: match.matchId,
    matchCode: match.matchCode,
    classCode: match.classCode,
    status: match.game?.phase ?? "lobby",
    players: match.players.map(serverPlayerToLobby),
    turns: match.audit,
    finalObservationByCompany,
  };
}

/** Reset between tests. */
export function _resetAll(): void {
  classes.clear();
  matches.clear();
  matchesByCode.clear();
}
