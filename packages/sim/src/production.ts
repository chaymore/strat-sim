import {
  DEFAULTS,
  NUM_AXES,
  PRODUCTION,
  type FeatureVector,
  type RDAllocation,
} from "@strat-sim/shared";

/**
 * Capability-frontier production model (see PRODUCTION in shared/constants).
 *
 * A company's per-axis capability stock K both caps the quality it can ship on
 * that axis (the frontier) and sets how expensive a given quality is to build.
 * R&D grows K; shipping near the frontier is dear; mature capability is cheaper.
 */

/** Max shippable quality on an axis given its capability stock K. */
export function frontier(capability: number): number {
  const k = Math.max(0, capability);
  return k / (k + PRODUCTION.frontierK0);
}

export function frontierVector(caps: FeatureVector): FeatureVector {
  return [
    frontier(caps[0] ?? 0),
    frontier(caps[1] ?? 0),
    frontier(caps[2] ?? 0),
    frontier(caps[3] ?? 0),
  ] as const;
}

/** Per-unit cost of building quality Q on one axis at capability K. */
export function axisBuildCost(quality: number, capability: number): number {
  const q = Math.max(0, quality);
  if (q <= 0) return 0;
  const f = frontier(capability);
  if (f <= 0) return 0;
  const stretch = Math.min(1, q / f); // 1 == shipping right at the frontier
  // Mature capability discounts cost everywhere (gentle, never below the start level).
  const eff = Math.pow(
    PRODUCTION.startCapability / Math.max(PRODUCTION.startCapability, capability),
    PRODUCTION.effPow,
  );
  return (
    PRODUCTION.axisCostScale *
    Math.pow(q, PRODUCTION.costExp) *
    eff *
    (1 + PRODUCTION.stretchPenalty * stretch * stretch)
  );
}

/** Total marginal cost to build one unit of a product at the given quality + capability. */
export function unitCost(features: FeatureVector, caps: FeatureVector): number {
  let c = DEFAULTS.baseUnitCost;
  for (let i = 0; i < NUM_AXES; i++) {
    c += axisBuildCost(features[i] ?? 0, caps[i] ?? 0);
  }
  return c;
}

/** Grow the capability stock by the R&D points invested per axis this turn. */
export function growCapabilities(caps: FeatureVector, rd: RDAllocation): FeatureVector {
  return [
    (caps[0] ?? 0) + Math.max(0, rd.privacy),
    (caps[1] ?? 0) + Math.max(0, rd.capability),
    (caps[2] ?? 0) + Math.max(0, rd.design),
    (caps[3] ?? 0) + Math.max(0, rd.wellness),
  ] as const;
}

/** Clamp a desired quality vector to what each axis's capability frontier allows. */
export function clampToFrontier(quality: FeatureVector, caps: FeatureVector): FeatureVector {
  const out: number[] = [];
  for (let i = 0; i < NUM_AXES; i++) {
    const q = Math.max(0, quality[i] ?? 0);
    out.push(Math.min(q, frontier(caps[i] ?? 0)));
  }
  return [out[0]!, out[1]!, out[2]!, out[3]!] as const;
}
