import {
  SEGMENTS,
  type CompanyId,
  type FeatureVector,
  type GameState,
  type ObservationView,
  type PrivateCompanyView,
  type PublicCompanyView,
  type PublicConsumerView,
  type SegmentView,
} from "@strat-sim/shared";
import { frontierVector, unitCost } from "./production.js";

export function buildObservation(state: GameState, asCompanyId: CompanyId): ObservationView {
  const me = state.companies[asCompanyId];
  if (!me) throw new Error(`Unknown company ${asCompanyId}`);
  const totalCustomers = Object.values(state.companies).reduce((s, c) => s + c.customers, 0) || 1;

  const you: PrivateCompanyView = {
    id: me.id,
    name: me.name,
    archetype: me.archetype,
    product: me.product,
    customers: me.customers,
    subscribers: me.subscribers,
    marketShare: me.customers / totalCustomers,
    brandReputation: me.brandReputation,
    marketCap: me.history.at(-1)?.marketCap ?? 0,
    history: me.history.slice(),
    cash: me.cash,
    capacity: me.capacity,
    rdPoints: me.rdPoints,
    capabilities: me.capabilities,
    qualityFrontier: frontierVector(me.capabilities),
    unitCost: unitCost(me.product.features, me.capabilities),
  };

  const competitors: PublicCompanyView[] = Object.values(state.companies)
    .filter((c) => c.id !== asCompanyId)
    .map((c) => ({
      id: c.id,
      name: c.name,
      archetype: c.archetype,
      product: c.product,
      customers: c.customers,
      subscribers: c.subscribers,
      marketShare: c.customers / totalCustomers,
      brandReputation: c.brandReputation,
      marketCap: c.history.at(-1)?.marketCap ?? 0,
      history: c.history.slice(),
    }));

  const consumers: PublicConsumerView[] = state.consumers.map((c) => ({
    id: c.id,
    position: c.position,
    adopted: c.adopted,
  }));

  const segments = buildSegmentViews(state);
  const totalAdopted = state.consumers.reduce((s, c) => s + (c.adopted ? 1 : 0), 0);

  return {
    matchId: state.config.matchId,
    turn: state.turn,
    phase: state.phase,
    maxTurns: state.config.maxTurns,
    marketCapWinThreshold: state.config.marketCapWinThreshold,
    winnerId: state.winnerId,
    you,
    competitors,
    consumers,
    segments,
    totalMarket: state.consumers.length,
    totalAdopted,
    log: state.log.slice(-20),
  };
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function buildSegmentViews(state: GameState): SegmentView[] {
  return SEGMENTS.map((seg, segIdx) => {
    const members = state.consumers.filter((c) => c.segment === segIdx);
    const size = members.length;
    const adopted = members.reduce((s, c) => s + (c.adopted ? 1 : 0), 0);
    const sums = [0, 0, 0, 0];
    for (const c of members) {
      for (let a = 0; a < 4; a++) sums[a]! += c.prefs[a] ?? 0;
    }
    const prefs = (size > 0
      ? (sums.map((s) => s / size) as number[])
      : [...seg.center]) as unknown as FeatureVector;
    return {
      key: seg.key,
      name: seg.name,
      blurb: seg.blurb,
      prefs,
      priceRange: seg.priceRange,
      size,
      adopted,
      medianPriceCeiling: median(members.map((c) => c.priceCeiling)),
    };
  });
}
