import {
  DEFAULTS,
  NUM_AXES,
  type Company,
  type CompanyId,
  type FeatureVector,
  type GameState,
  type TurnDecision,
} from "@strat-sim/shared";
import { rollAdoptions } from "./adoption.js";
import {
  computeMarketCap,
  computeMarketShare,
  computeTurnFinancials,
  recordSnapshot,
  sumRD,
} from "./finance.js";
import { NeighborIndex } from "./neighbors.js";
import { Rng } from "./rng.js";

export interface ResolveResult {
  state: GameState;
  perCompany: Record<CompanyId, ResolvedCompany>;
}

export interface ResolvedCompany {
  unitsSold: number;
  newCustomers: number;
  newSubscribers: number;
  ebitda: number;
  marketCap: number;
  marketShare: number;
  cash: number;
}

const EPS = 1e-9;

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function applyRD(features: FeatureVector, rdSpent: { privacy: number; capability: number; design: number; wellness: number }): FeatureVector {
  // Diminishing returns: each point pushes feature by k/(k+points) toward 1
  const next: number[] = [];
  const axes = [rdSpent.privacy, rdSpent.capability, rdSpent.design, rdSpent.wellness];
  for (let i = 0; i < NUM_AXES; i++) {
    const cur = features[i] ?? 0;
    const pts = axes[i] ?? 0;
    const delta = (1 - cur) * (pts / (pts + 8));
    next.push(clamp01(cur + delta));
  }
  return [next[0]!, next[1]!, next[2]!, next[3]!] as const;
}

function applyMarketing(state: GameState, decisions: Record<CompanyId, TurnDecision>): void {
  // Simple model: marketing spend → awareness increase, with optional segment boost.
  // Segment-targeted spend is more efficient on consumers whose top axis matches.
  for (const id of Object.keys(decisions)) {
    const d = decisions[id]!;
    const m = d.marketing;
    if (m.total <= 0) continue;
    const points = m.total / DEFAULTS.marketingPointCost; // "reach points"
    for (const c of state.consumers) {
      const base = points / state.consumers.length; // broad baseline
      let boost = 0;
      if (m.segmentTarget !== "broad") {
        const axisIdx = ["privacy", "capability", "design", "wellness"].indexOf(m.segmentTarget);
        const aff = c.prefs[axisIdx] ?? 0;
        if (aff > 0.3) boost = (aff - 0.3) * (points / state.consumers.length) * 4;
      }
      const inc = base + boost;
      const cur = c.awareness[id] ?? 0;
      c.awareness[id] = Math.min(1, cur + inc);
    }
  }
}

function decayAwareness(state: GameState): void {
  for (const c of state.consumers) {
    for (const k of Object.keys(c.awareness)) {
      c.awareness[k] = (c.awareness[k] ?? 0) * 0.85;
    }
  }
}

/** Validate & clamp a decision against company resources. Returns sanitized copy. */
export function sanitizeDecision(company: Company, raw: TurnDecision): TurnDecision {
  const rdPoints = Math.max(0, Math.floor(sumRD(raw)));
  const rdCost = rdPoints * DEFAULTS.rdPointCost;
  const mkt = Math.max(0, raw.marketing.total);
  const cap = Math.max(0, Math.floor(raw.capacityInvestment));
  const capCost = cap * DEFAULTS.capacityCostPerUnit;

  // If they overspend, scale down marketing then capacity then RD.
  let budget = company.cash;
  let rdFinal = rdCost;
  let mktFinal = mkt;
  let capFinalCost = capCost;
  let total = rdFinal + mktFinal + capFinalCost;
  if (total > budget) {
    const overshoot = total - budget;
    const cutMkt = Math.min(mktFinal, overshoot);
    mktFinal -= cutMkt;
    total -= cutMkt;
  }
  if (total > budget) {
    const overshoot = total - budget;
    const cutCap = Math.min(capFinalCost, overshoot);
    capFinalCost -= cutCap;
    total -= cutCap;
  }
  if (total > budget) {
    const overshoot = total - budget;
    rdFinal = Math.max(0, rdFinal - overshoot);
  }

  const scaledRdPoints = Math.floor(rdFinal / DEFAULTS.rdPointCost);
  const rdScale = rdPoints > 0 ? scaledRdPoints / rdPoints : 0;
  const rd = {
    privacy: Math.floor(raw.rd.privacy * rdScale),
    capability: Math.floor(raw.rd.capability * rdScale),
    design: Math.floor(raw.rd.design * rdScale),
    wellness: Math.floor(raw.rd.wellness * rdScale),
  };
  return {
    companyId: company.id,
    price: Math.max(0, raw.price),
    subscriptionPrice: Math.max(0, raw.subscriptionPrice),
    rd,
    marketing: { total: mktFinal, segmentTarget: raw.marketing.segmentTarget },
    capacityInvestment: Math.floor(capFinalCost / DEFAULTS.capacityCostPerUnit),
    positioningStatement: raw.positioningStatement ?? "",
  };
}

export function submitDecision(state: GameState, decision: TurnDecision): void {
  const company = state.companies[decision.companyId];
  if (!company) throw new Error(`Unknown company ${decision.companyId}`);
  state.pendingDecisions[decision.companyId] = sanitizeDecision(company, decision);
}

export function allDecisionsIn(state: GameState): boolean {
  return Object.keys(state.companies).every((id) => state.pendingDecisions[id] != null);
}

export function resolveTurn(state: GameState): ResolveResult {
  if (state.phase !== "decision") throw new Error(`resolveTurn: bad phase ${state.phase}`);
  state.phase = "resolving";
  const turnRng = new Rng(state.config.seed ^ ((state.turn + 1) * 0x9e3779b1));
  const neighbors = new NeighborIndex(state.consumers, DEFAULTS.womNeighborCount);
  const companyIds = Object.keys(state.companies);

  // 1. Apply R&D, capacity, subscription price updates.
  for (const id of companyIds) {
    const co = state.companies[id]!;
    const d =
      state.pendingDecisions[id] ??
      defaultDecision(id, co.product.price, co.product.subscriptionPrice);
    co.product = {
      features: applyRD(co.product.features, d.rd),
      price: d.price,
      subscriptionPrice: d.subscriptionPrice,
    };
    co.capacity += d.capacityInvestment;
  }

  // 2. Marketing → awareness.
  decayAwareness(state);
  applyMarketing(state, state.pendingDecisions);

  // 3. Decide who evaluates: all non-customers + a fraction of existing customers.
  const evaluators: number[] = [];
  for (let i = 0; i < state.consumers.length; i++) {
    const c = state.consumers[i]!;
    if (c.adopted == null) {
      evaluators.push(i);
    } else if (turnRng.next() < DEFAULTS.switcherFraction) {
      evaluators.push(i);
    }
  }
  turnRng.shuffle(evaluators);

  // 4. Roll adoption decisions.
  const companies = companyIds.map((id) => state.companies[id]!);
  const decisions = rollAdoptions(turnRng, state.consumers, evaluators, companies, neighbors, DEFAULTS.womNeighborCount);

  // 5. Apply with capacity gating. Random allocation when oversubscribed (decisions are pre-shuffled).
  const remainingCap: Record<CompanyId, number> = {};
  const newUnits: Record<CompanyId, number> = {};
  const churn: Record<CompanyId, number> = {};
  for (const id of companyIds) {
    remainingCap[id] = state.companies[id]!.capacity;
    newUnits[id] = 0;
    churn[id] = 0;
  }

  for (const dec of decisions) {
    const consumer = state.consumers[dec.consumerIdx]!;
    const prev = consumer.adopted;
    const target = dec.pickedCompanyId;

    if (target === prev) continue;
    if (target == null) {
      // Switcher who picked no-adopt → churn.
      if (prev) {
        churn[prev] = (churn[prev] ?? 0) + 1;
        consumer.adopted = null;
        consumer.subscribed = false;
      }
      continue;
    }
    const cap = remainingCap[target] ?? 0;
    if (cap <= 0) {
      // Company can't fulfill — consumer keeps current allegiance (or stays unadopted).
      continue;
    }
    if (prev) churn[prev] = (churn[prev] ?? 0) + 1;
    consumer.adopted = target;
    // Subscription opt-in proportional to subPrice attractiveness vs price.
    const subPrice = state.companies[target]!.product.subscriptionPrice;
    if (subPrice > 0) {
      const attach = Math.max(0, Math.min(0.95, 0.6 - subPrice / 200));
      consumer.subscribed = turnRng.next() < attach;
    } else {
      consumer.subscribed = false;
    }
    remainingCap[target] = cap - 1;
    newUnits[target] = (newUnits[target] ?? 0) + 1;
  }

  // 6. Recount customers + subscribers.
  for (const id of companyIds) {
    state.companies[id]!.customers = 0;
    state.companies[id]!.subscribers = 0;
  }
  for (const c of state.consumers) {
    if (c.adopted) {
      const co = state.companies[c.adopted];
      if (co) {
        co.customers++;
        if (c.subscribed) co.subscribers++;
      }
    }
  }

  // 7. Finance + brand updates + market cap.
  const totalCustomers = Object.values(state.companies).reduce((s, c) => s + c.customers, 0);
  const perCompany: Record<CompanyId, ResolvedCompany> = {};
  for (const id of companyIds) {
    const co = state.companies[id]!;
    const d = state.pendingDecisions[id]!;
    const unitsSold = newUnits[id] ?? 0;
    const newSubs = 0; // already counted via consumers
    const fin = computeTurnFinancials(co, d, unitsSold, newSubs);
    co.cash += fin.ebitda;

    // Brand reputation: marketing helps, churn hurts.
    const brandDelta =
      Math.log10(1 + fin.marketingSpend / 5_000) * 0.6 -
      (churn[id] ?? 0) * 0.3 +
      (unitsSold > 0 ? Math.log10(1 + unitsSold) * 0.5 : 0);
    co.brandReputation = Math.max(0, Math.min(100, co.brandReputation + brandDelta));

    co.rdPoints += sumRD(d);

    const marketShare = computeMarketShare(co, totalCustomers);
    const marketCap = computeMarketCap(co, fin.ebitda, fin.recurringRevenue);
    recordSnapshot(co, state.turn + 1, fin, marketCap, marketShare);

    // Update derived archetype label for UX clarity.
    co.archetype = inferArchetype(co);

    perCompany[id] = {
      unitsSold,
      newCustomers: unitsSold,
      newSubscribers: 0,
      ebitda: fin.ebitda,
      marketCap,
      marketShare,
      cash: co.cash,
    };
  }

  // 8. Advance turn, check victory.
  state.turn += 1;
  state.pendingDecisions = {};
  const threshold = state.config.marketCapWinThreshold;
  let winner: CompanyId | null = null;
  let winnerCap = -Infinity;

  if (state.turn >= state.config.maxTurns) {
    for (const id of companyIds) {
      const cap = perCompany[id]!.marketCap;
      if (cap > winnerCap) {
        winnerCap = cap;
        winner = id;
      }
    }
  } else {
    for (const id of companyIds) {
      const cap = perCompany[id]!.marketCap;
      if (cap >= threshold && cap > winnerCap) {
        winnerCap = cap;
        winner = id;
      }
    }
  }

  if (winner) {
    state.winnerId = winner;
    state.phase = "ended";
    state.log.push(`Turn ${state.turn}: ${state.companies[winner]!.name} wins with market cap $${Math.round(winnerCap).toLocaleString()}`);
  } else {
    state.phase = state.turn >= state.config.maxTurns ? "ended" : "decision";
    state.log.push(`Turn ${state.turn} resolved`);
  }

  return { state, perCompany };
}

function defaultDecision(id: CompanyId, price: number, subPrice: number): TurnDecision {
  return {
    companyId: id,
    price,
    subscriptionPrice: subPrice,
    rd: { privacy: 0, capability: 0, design: 0, wellness: 0 },
    marketing: { total: 0, segmentTarget: "broad" },
    capacityInvestment: 0,
  };
}

function inferArchetype(co: Company): Company["archetype"] {
  const f = co.product.features;
  const top = Math.max(f[0]!, f[1]!, f[2]!, f[3]!);
  const spread = top - Math.min(f[0]!, f[1]!, f[2]!, f[3]!);
  if (co.product.price < 220 && spread < 0.25) return "lowcost";
  if (co.product.price > 500 && top > 0.7) return "premium";
  if (spread > 0.4) return "niche";
  return "neutral";
}

export { EPS };
