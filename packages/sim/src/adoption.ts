import {
  ADOPTION_WEIGHTS,
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

/** Cosine-style fit in [0,1]. Both vectors are non-negative. */
function featureFit(prefs: FeatureVector, features: FeatureVector): number {
  const num = dot(prefs, features);
  const denom =
    Math.sqrt(dot(prefs, prefs) * dot(features, features)) || 1;
  return Math.max(0, Math.min(1, num / denom));
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

export function utilitiesFor(
  consumer: Consumer,
  companies: Company[],
  womCounts: Record<CompanyId, number>,
  womK: number,
): CompanyUtility[] {
  const w = ADOPTION_WEIGHTS;
  return companies.map((co) => {
    const fit = featureFit(consumer.prefs, co.product.features);
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

export interface AdoptionDecision {
  consumerIdx: number;
  pickedCompanyId: CompanyId | null;
}

/**
 * For each evaluating consumer, sample a single choice (or no-adopt).
 * Caller is responsible for which consumers evaluate (new + a fraction of switchers)
 * and for enforcing capacity afterward.
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
    const allUtils = utils.map((u) => u.utility);
    allUtils.push(ADOPTION_WEIGHTS.noAdoptUtility);

    const probs = softmax(allUtils);
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
    const pickedCompanyId =
      pickedIdx === probs.length - 1 ? null : utils[pickedIdx]!.companyId;
    out.push({ consumerIdx: idx, pickedCompanyId });
  }
  return out;
}
