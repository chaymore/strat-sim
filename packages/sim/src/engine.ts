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
  const resolvedTurn = state.turn + 1;
  const turnRng = new Rng(state.config.seed ^ (resolvedTurn * 0x9e3779b1));
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

  // 3. Decide who evaluates this turn:
  //    - shoppers who don't own anything yet (still deciding if it's good enough),
  //    - owners whose product has worn out and must be replaced,
  //    - a small fraction of other owners who re-shop and might switch.
  const evaluators: number[] = [];
  const dueForReplacement = new Set<number>();
  for (let i = 0; i < state.consumers.length; i++) {
    const c = state.consumers[i]!;
    if (c.adopted == null) {
      evaluators.push(i);
      continue;
    }
    const age = c.purchaseTurn == null ? Infinity : resolvedTurn - c.purchaseTurn;
    if (age >= c.replacementInterval) {
      dueForReplacement.add(i);
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
  const demand: Record<CompanyId, number> = {};
  const churn: Record<CompanyId, number> = {};
  for (const id of companyIds) {
    remainingCap[id] = state.companies[id]!.capacity;
    newUnits[id] = 0;
    demand[id] = 0;
    churn[id] = 0;
  }

  for (const dec of decisions) {
    const idx = dec.consumerIdx;
    const consumer = state.consumers[idx]!;
    const prev = consumer.adopted;
    const target = dec.pickedCompanyId;
    const due = dueForReplacement.has(idx);

    if (target == null) {
      // Didn't find anything worth buying. An owner whose product wore out and
      // who isn't replacing it lapses out of the market; others just keep waiting.
      if (due && prev) {
        churn[prev] = (churn[prev] ?? 0) + 1;
        consumer.adopted = null;
        consumer.subscribed = false;
        consumer.purchaseTurn = null;
      }
      continue;
    }

    // Re-shopping owner who sticks with a still-working product → no shipment.
    if (target === prev && !due) continue;

    // Wants a shipment (new buyer, switcher, or replacement).
    demand[target] = (demand[target] ?? 0) + 1;
    if ((remainingCap[target] ?? 0) <= 0) {
      // Out of capacity — sale is lost. A replacement that can't be filled keeps
      // limping along on the old unit rather than lapsing.
      continue;
    }

    if (prev && prev !== target) churn[prev] = (churn[prev] ?? 0) + 1;
    consumer.adopted = target;
    consumer.purchaseTurn = resolvedTurn;

    // Subscription opt-in: cheaper subs and stronger brands attach better.
    const co = state.companies[target]!;
    const subPrice = co.product.subscriptionPrice;
    if (subPrice > 0) {
      const brandFactor = 0.6 + 0.4 * Math.min(1, co.brandReputation / 100);
      // Hesitance: people commit to recurring billing more reluctantly than a
      // one-time purchase, so the attach rate is damped below the price/brand fit.
      const attach = Math.max(
        0,
        Math.min(0.9, (0.55 - subPrice / 240) * brandFactor * DEFAULTS.subscriptionHesitance),
      );
      consumer.subscribed = turnRng.next() < attach;
    } else {
      consumer.subscribed = false;
    }
    remainingCap[target] = (remainingCap[target] ?? 0) - 1;
    newUnits[target] = (newUnits[target] ?? 0) + 1;
  }

  // 5b. Subscription churn: existing subscribers (not the ones who just signed
  // up this turn) cancel at a steady rate, so recurring revenue must be re-earned.
  for (const c of state.consumers) {
    if (c.subscribed && c.purchaseTurn !== resolvedTurn && turnRng.next() < DEFAULTS.subscriptionChurn) {
      c.subscribed = false;
    }
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

  // 6b. Drift consumers — small jitter for unadopted, gentle pull toward
  // company centroid for adopters ("they move closer to you if they bought your product").
  driftConsumers(state, turnRng);

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

    // Brand reputation is a stock: it erodes a fixed fraction each turn and is
    // renewed by marketing spend and good sales (churn erodes it further).
    const brandDelta =
      Math.log10(1 + fin.marketingSpend / 5_000) * 0.6 -
      (churn[id] ?? 0) * 0.3 +
      (unitsSold > 0 ? Math.log10(1 + unitsSold) * 0.5 : 0);
    const decayed = co.brandReputation * (1 - DEFAULTS.brandDecayRate);
    co.brandReputation = Math.max(0, Math.min(100, decayed + brandDelta));

    co.rdPoints += sumRD(d);

    const marketShare = computeMarketShare(co, totalCustomers);
    const marketCap = computeMarketCap(co, fin.ebitda, fin.recurringRevenue);
    recordSnapshot(co, resolvedTurn, fin, marketCap, marketShare, demand[id] ?? 0);

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

function driftConsumers(state: GameState, rng: Rng): void {
  const { width, height } = DEFAULTS.worldSize;
  const JITTER = 0.35;
  const PULL = 0.06;
  for (const c of state.consumers) {
    let dx = (rng.next() - 0.5) * JITTER * 2;
    let dy = (rng.next() - 0.5) * JITTER * 2;
    if (c.adopted) {
      // Adopters gravitate toward the box of the company they bought from.
      const hq = state.companies[c.adopted]?.hqPosition;
      if (hq) {
        dx += (hq.x - c.position.x) * PULL;
        dy += (hq.y - c.position.y) * PULL;
      }
    }
    c.position = {
      x: Math.max(0, Math.min(width, c.position.x + dx)),
      y: Math.max(0, Math.min(height, c.position.y + dy)),
    };
  }
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
