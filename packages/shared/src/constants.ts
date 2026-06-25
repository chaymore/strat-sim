export const FEATURE_AXES = ["privacy", "capability", "design", "wellness"] as const;
export type FeatureAxis = (typeof FEATURE_AXES)[number];

export const NUM_AXES = FEATURE_AXES.length;

export const DEFAULTS = {
  numConsumers: 600, // large latent pool; only a fraction buy each turn
  worldSize: { width: 40, height: 40 },
  maxTurns: 16, // longer game so the gradual diffusion curve has room to play out
  turnTimerSeconds: 90,
  startingCash: 1_000_000,
  startingCapacity: 50,
  startingBrand: 20,
  startingFeatures: [0.5, 0.5, 0.5, 0.5] as const,
  marketCapWinThreshold: 30_000_000, // interim: reflects the halved customerLtv; finalized with the capability/margin work
  womNeighborCount: 6,
  baseUnitCost: 80,
  capacityCostPerUnit: 200,
  rdPointCost: 10_000,
  marketingPointCost: 5_000,
  subscriptionMonthly: 0, // each company picks
  switcherFraction: 0.06, // fraction of existing owners that re-shop each turn
  replacementMin: 3, // owned products wear out after 3..4 turns and must be replaced
  replacementMax: 4,
  subscriptionChurn: 0.07, // chance a subscriber cancels in a given turn
  subscriptionHesitance: 0.65, // global friction: buyers commit to recurring billing more reluctantly than a one-time purchase (scales attach toward 0)
  brandDecayRate: 0.05, // brand is a stock that erodes ~5%/turn toward 0 unless renewed by marketing and good sales
  purchaseLogisticK: 2.6, // steepness of the buy-probability curve around a consumer's threshold
} as const;

export const ADOPTION_WEIGHTS = {
  fit: 1.7, // absolute, preference-weighted product quality (how "good enough" it is)
  price: 1.1,
  brand: 0.5,
  wom: 0.9,
  awareness: 0.7,
} as const;

/**
 * Bass "diffusion of innovation" coefficients. Each evaluating consumer's
 * per-turn hazard of buying is `p + q·(neighbors who already adopted)`, gated by
 * whether the best product is "good enough" for its Rogers threshold.
 *   p — innovation/awareness coefficient. A small autonomous trickle (pBase)
 *       plus a marketing-driven term (pAwareness × awareness of the best brand).
 *       High p ⇒ fast initial adoption (a well-marketed launch).
 *   q — imitation/social coefficient. Scales with the fraction of a consumer's
 *       neighbors who have already adopted anything. High q with low p ⇒ a slow,
 *       viral S-curve that builds momentum through social proof.
 */
export const BASS = {
  pBase: 0.04, // autonomous awareness even with no marketing
  pAwareness: 0.55, // how strongly marketing-built awareness raises p
  qSocial: 0.75, // word-of-mouth imitation strength
} as const;

/**
 * Capability-frontier production model. Each company holds a per-axis capability
 * stock K (see Company.capabilities) that R&D grows over time. K does two jobs:
 *   - Frontier: the max quality it can ship on that axis is K/(K+frontierK0), so
 *     pushing toward quality 1 needs ever more capability (diminishing returns).
 *   - Cost: building a unit at quality Q on an axis costs more as Q rises
 *     (convex, costExp) and as Q nears the frontier (stretchPenalty), and less as
 *     capability matures (effPow discount). So investing capability both unlocks
 *     higher quality AND makes a given quality cheaper to produce.
 * startCapability is tuned so a fresh firm's frontier is 0.5 (== startingFeatures).
 */
export const PRODUCTION = {
  frontierK0: 8,
  startCapability: 8, // frontier(8) = 0.5
  axisCostScale: 26, // $ scale of per-axis build cost at quality 1, base capability
  costExp: 1.3, // convexity of cost in quality (L10 ≈ 2.5× L5)
  stretchPenalty: 0.5, // extra cost for shipping right at your frontier
  effPow: 0.15, // how strongly mature capability discounts unit cost (kept gentle so higher quality always costs more in the playable range)
} as const;

export const MARKET_CAP_MULT = {
  ebitda: 6, // reward real per-turn profitability more
  recurringAnnual: 6,
  customerLtv: 35_000, // installed-base value; lower so grabbing cheap customers isn't an auto-win
  brandFloor: 50,
  rdPipeline: 40_000,
  growthCap: 8_000_000,
} as const;

/**
 * Rogers "diffusion of innovations" adopter categories. Each consumer is born
 * into one; the threshold is the product appeal it demands before it will buy.
 * Early on, only low-threshold innovators find anything "good enough"; as
 * companies build their product up over time, the mainstream crosses its bar.
 */
export interface AdopterCategory {
  key: string;
  name: string;
  share: number; // fraction of the population
  threshold: number; // appeal required to consider buying
  blurb: string;
}

export const ADOPTER_CATEGORIES: readonly AdopterCategory[] = [
  { key: "innovator", name: "Innovators", share: 0.025, threshold: 1.45, blurb: "Buy the bleeding edge even when it's rough." },
  { key: "early_adopter", name: "Early adopters", share: 0.135, threshold: 1.95, blurb: "Jump in once a product shows real promise." },
  { key: "early_majority", name: "Early majority", share: 0.34, threshold: 2.5, blurb: "Wait for the product to prove itself." },
  { key: "late_majority", name: "Late majority", share: 0.34, threshold: 3.0, blurb: "Adopt only once it's clearly mainstream." },
  { key: "laggard", name: "Laggards", share: 0.16, threshold: 3.55, blurb: "Hold out until there's no good alternative." },
] as const;

export interface SegmentDef {
  key: FeatureAxis;
  name: string;
  center: readonly [number, number, number, number];
  priceRange: readonly [number, number];
  blurb: string;
}

/**
 * Fixed company HQ corners in world coordinates, assigned to companies by their
 * order in the match lineup. The town renders each company's "box" here, and
 * consumers who adopt a company drift toward its box (see driftConsumers).
 */
export const HQ_CORNERS: readonly { x: number; y: number }[] = [
  { x: 4, y: 4 },
  { x: 35, y: 4 },
  { x: 4, y: 35 },
  { x: 35, y: 35 },
] as const;

/** Four latent customer segments, each clustered around one feature axis. */
export const SEGMENTS: readonly SegmentDef[] = [
  {
    key: "privacy",
    name: "Privacy Hawks",
    center: [0.7, 0.3, 0.4, 0.4],
    priceRange: [180, 420],
    blurb: "Won't wear anything that leaks their data. Value on-device privacy above flash.",
  },
  {
    key: "capability",
    name: "Power Users",
    center: [0.3, 0.8, 0.5, 0.4],
    priceRange: [350, 800],
    blurb: "Want the smartest, most capable assistant and will pay a premium for it.",
  },
  {
    key: "design",
    name: "Trendsetters",
    center: [0.4, 0.4, 0.8, 0.3],
    priceRange: [220, 600],
    blurb: "Treat the wearable as fashion — design and brand cachet drive the purchase.",
  },
  {
    key: "wellness",
    name: "Wellness Seekers",
    center: [0.5, 0.4, 0.4, 0.8],
    priceRange: [200, 550],
    blurb: "Buy for health and fitness tracking; happy to subscribe for ongoing coaching.",
  },
] as const;
