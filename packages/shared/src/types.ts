import type { FeatureAxis } from "./constants.js";

export type CompanyId = string;
export type ConsumerId = string;
export type MatchId = string;

export type FeatureVector = readonly [number, number, number, number];

export interface Position {
  x: number;
  y: number;
}

export interface Product {
  features: FeatureVector;
  price: number;
  subscriptionPrice: number;
}

export interface Company {
  id: CompanyId;
  name: string;
  archetype: "neutral" | "lowcost" | "premium" | "niche";
  cash: number;
  capacity: number;
  rdPoints: number;
  brandReputation: number;
  product: Product;
  customers: number;
  subscribers: number;
  history: TurnSnapshot[];
}

export interface TurnSnapshot {
  turn: number;
  customers: number;
  subscribers: number;
  revenue: number;
  ebitda: number;
  marketCap: number;
  marketShare: number;
}

export interface Consumer {
  id: ConsumerId;
  position: Position;
  prefs: FeatureVector;
  priceCeiling: number;
  adopted: CompanyId | null;
  subscribed: boolean;
  awareness: Record<CompanyId, number>;
}

export interface RDAllocation {
  privacy: number;
  capability: number;
  design: number;
  wellness: number;
}

export interface MarketingAllocation {
  total: number;
  segmentTarget: FeatureAxis | "broad";
}

export interface TurnDecision {
  companyId: CompanyId;
  price: number;
  subscriptionPrice: number;
  rd: RDAllocation;
  marketing: MarketingAllocation;
  capacityInvestment: number;
  positioningStatement?: string;
}

export type GamePhase = "lobby" | "decision" | "resolving" | "reveal" | "ended";

export interface MatchConfig {
  matchId: MatchId;
  seed: number;
  numConsumers: number;
  maxTurns: number;
  marketCapWinThreshold: number;
  companies: { id: CompanyId; name: string }[];
}

export interface GameState {
  config: MatchConfig;
  turn: number;
  phase: GamePhase;
  companies: Record<CompanyId, Company>;
  consumers: Consumer[];
  pendingDecisions: Record<CompanyId, TurnDecision>;
  winnerId: CompanyId | null;
  log: string[];
}

export interface PublicCompanyView {
  id: CompanyId;
  name: string;
  archetype: Company["archetype"];
  product: Product;
  customers: number;
  subscribers: number;
  marketShare: number;
  brandReputation: number;
  marketCap: number;
}

export interface PublicConsumerView {
  id: ConsumerId;
  position: Position;
  adopted: CompanyId | null;
}

export interface PrivateCompanyView extends PublicCompanyView {
  cash: number;
  capacity: number;
  rdPoints: number;
  history: TurnSnapshot[];
}

export interface ObservationView {
  matchId: MatchId;
  turn: number;
  phase: GamePhase;
  maxTurns: number;
  marketCapWinThreshold: number;
  you: PrivateCompanyView;
  competitors: PublicCompanyView[];
  consumers: PublicConsumerView[];
  log: string[];
}
