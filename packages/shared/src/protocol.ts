import type {
  CompanyId,
  GameState,
  MatchId,
  ObservationView,
  TurnDecision,
} from "./types.js";

export type ClassCode = string;
export type MatchCode = string;
export type PlayerToken = string;
export type PlayerId = string;
export type Role = "instructor" | "student" | "ai" | "bot";

export interface PublicClassroom {
  code: ClassCode;
  name: string;
  createdAt: number;
  matchSummaries: MatchSummary[];
}

export interface MatchSummary {
  matchId: MatchId;
  matchCode: MatchCode;
  status: "lobby" | "playing" | "ended";
  turn: number;
  maxTurns: number;
  playerCount: number;
  seatCount: number;
  createdAt: number;
  endedAt: number | null;
  winnerName: string | null;
}

export interface LobbyPlayer {
  playerId: PlayerId;
  name: string;
  role: Role;
  companyId: CompanyId;
  ready: boolean;
  connected: boolean;
  isBot: boolean;
}

export interface LobbyState {
  matchId: MatchId;
  matchCode: MatchCode;
  classCode: ClassCode;
  status: "lobby" | "playing" | "ended";
  seatCount: number;
  players: LobbyPlayer[];
  startedAt: number | null;
  hostPlayerId: PlayerId | null;
}

export type ClientMessage =
  | { type: "hello"; token: PlayerToken }
  | { type: "set-ready"; ready: boolean }
  | { type: "start-match" }
  | { type: "submit-decision"; decision: TurnDecision };

export type ServerMessage =
  | { type: "lobby"; lobby: LobbyState }
  | { type: "observation"; observation: ObservationView; awaitingCompanyIds: CompanyId[] }
  | { type: "turn-resolved"; turn: number; observation: ObservationView }
  | { type: "match-ended"; observation: ObservationView; winnerName: string | null }
  | { type: "error"; message: string };

/**
 * Snapshot of per-player decisions for a single turn, used by the instructor
 * dashboard to replay the match.
 */
export interface TurnAudit {
  turn: number;
  decisions: Record<PlayerId, TurnDecision>;
  resolvedAt: number;
}

export interface MatchAudit {
  matchId: MatchId;
  matchCode: MatchCode;
  classCode: ClassCode;
  status: GameState["phase"];
  players: LobbyPlayer[];
  turns: TurnAudit[];
  finalObservationByCompany: Record<CompanyId, ObservationView>;
}
