import {
  ADOPTION_WEIGHTS,
  DEFAULTS,
  NUM_AXES,
  type Company,
  type CompanyId,
  type Consumer,
  type FeatureVector,
} from "@strat-sim/shared";
import type { Rng } from "./rng.js";
import type { NeighborIndex } from "./neighbors.js";

function dot(a: FeatureVector, b: FeatureVector): number {
  let s = 0;
  for (let i = 0; i < NUM_AXES; i++) s += (a[i] ?? 0) * (b[i] ?? 0);
  return s;
}

/**
 * Absolute, preference-weighted product quality in [0,1]. Because prefs are
 * normalized to sum to 1, this is the consumer's weighted average of the
 * product's feature levels — i.e. "how good is this product on the things I
 * actually care about." A fresh 0.5-across product scores ~0.5; investing R&D
 * into the axes a segment values pushes it toward 1 (the "build it up over
 * time until it's good enough" dynamic).
 */
function qualityFit(prefs: FeatureVector, features: FeatureVector): number {
  return Math.max(0, Math.min(1, dot(prefs, features)));
}

function priceFit(price: number, ceiling: number): number {
  if (price <= 0) return 1;
  if (ceiling <= 0) return 0;
  if (price > ceiling) {
    // sharp falloff once over ceiling
    const over = (price - ceiling) / ceiling;
    return Math.max(0, 0.2 - over);
  }
  // headroom under ceiling rewarded mildly
  return 0.6 + 0.4 * (1 - price / ceiling);
}

export interface CompanyUtility {
  companyId: CompanyId;
  utility: number;
}

/** Per-company product appeal for one consumer (higher = more attractive). */
export function utilitiesFor(
  consumer: Consumer,
  companies: Company[],
  womCounts: Record<CompanyId, number>,
  womK: number,
): CompanyUtility[] {
  const w = ADOPTION_WEIGHTS;
  return companies.map((co) => {
    const fit = qualityFit(consumer.prefs, co.product.features);
    const price = priceFit(co.product.price, consumer.priceCeiling);
    const brand = Math.min(1, co.brandReputation / 100);
    const wom = (womCounts[co.id] ?? 0) / Math.max(1, womK);
    const aware = consumer.awareness[co.id] ?? 0;
    const utility =
      w.fit * fit +
      w.price * price +
      w.brand * brand +
      w.wom * wom +
      w.awareness * aware;
    return { companyId: co.id, utility };
  });
}

function softmax(values: number[]): number[] {
  const max = Math.max(...values);
  const exps = values.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0) || 1;
  return exps.map((e) => e / sum);
}

function logistic(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export interface AdoptionDecision {
  consumerIdx: number;
  pickedCompanyId: CompanyId | null;
}

/**
 * For each evaluating consumer, decide in two stages:
 *   1. Will it buy at all? Purchase probability is a logistic on how far the
 *      best available product's appeal exceeds the consumer's (diffusion)
 *      threshold. Early on, only low-threshold innovators clear the bar.
 *   2. If so, which company? A softmax over the competing products' appeals.
 *
 * Caller decides which consumers evaluate (new shoppers, a few switchers, and
 * owners whose product wore out) and enforces capacity afterward.
 */
export function rollAdoptions(
  rng: Rng,
  consumers: Consumer[],
  evaluatorIdxs: number[],
  companies: Company[],
  neighbors: NeighborIndex,
  womK: number,
): AdoptionDecision[] {
  const out: AdoptionDecision[] = [];
  for (const idx of evaluatorIdxs) {
    const c = consumers[idx]!;

    const womCounts: Record<CompanyId, number> = {};
    for (const nIdx of neighbors.neighborsOf(idx)) {
      const nb = consumers[nIdx];
      if (nb?.adopted) {
        womCounts[nb.adopted] = (womCounts[nb.adopted] ?? 0) + 1;
      }
    }

    const utils = utilitiesFor(c, companies, womCounts, womK);
    const appeals = utils.map((u) => u.utility);
    const best = appeals.length ? Math.max(...appeals) : 0;

    // Stage 1: diffusion gate.
    const buyProb = logistic(
      DEFAULTS.purchaseLogisticK * (best - c.adoptionThreshold),
    );
    if (rng.next() > buyProb) {
      out.push({ consumerIdx: idx, pickedCompanyId: null });
      continue;
    }

    // Stage 2: choose among competitors by appeal.
    const probs = softmax(appeals);
    const r = rng.next();
    let acc = 0;
    let pickedIdx = probs.length - 1;
    for (let i = 0; i < probs.length; i++) {
      acc += probs[i] ?? 0;
      if (r <= acc) {
        pickedIdx = i;
        break;
      }
    }
    out.push({ consumerIdx: idx, pickedCompanyId: utils[pickedIdx]?.companyId ?? null });
  }
  return out;
}
