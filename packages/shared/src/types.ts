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
  unitsSold: number; // units shipped this turn (new + switchers + replacements)
  demand: number; // consumers who wanted to buy from this company before capacity gating
}

export interface Consumer {
  id: ConsumerId;
  position: Position;
  prefs: FeatureVector;
  priceCeiling: number;
  /** Latent segment index (see SEGMENTS in constants). */
  segment: number;
  /** Rogers adopter-category index (see ADOPTER_CATEGORIES). */
  adopterCategory: number;
  /** Product appeal this consumer demands before it will buy at all. */
  adoptionThreshold: number;
  /** Turns until an owned product wears out and must be replaced. */
  replacementInterval: number;
  /** Turn on which the current product was purchased (null if never). */
  purchaseTurn: number | null;
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
  history: TurnSnapshot[];
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
}

/** Aggregate, per-segment market intel shown in the Segments tab. */
export interface SegmentView {
  key: FeatureAxis;
  name: string;
  blurb: string;
  /** Segment's average preference weights across the four axes. */
  prefs: FeatureVector;
  priceRange: readonly [number, number];
  /** Number of consumers in this segment. */
  size: number;
  /** How many of them currently own any product (adoption progress). */
  adopted: number;
  /** Median price ceiling for the segment. */
  medianPriceCeiling: number;
}

export interface ObservationView {
  matchId: MatchId;
  turn: number;
  phase: GamePhase;
  maxTurns: number;
  marketCapWinThreshold: number;
  winnerId: CompanyId | null;
  you: PrivateCompanyView;
  competitors: PublicCompanyView[];
  consumers: PublicConsumerView[];
  segments: SegmentView[];
  /** Size of the latent market and how many have adopted anything yet. */
  totalMarket: number;
  totalAdopted: number;
  log: string[];
}
