export const FEATURE_AXES = ["privacy", "capability", "design", "wellness"] as const;
export type FeatureAxis = (typeof FEATURE_AXES)[number];

export const NUM_AXES = FEATURE_AXES.length;

export const DEFAULTS = {
  numConsumers: 600, // large latent pool; only a fraction buy each turn
  worldSize: { width: 40, height: 40 },
  maxTurns: 10,
  turnTimerSeconds: 90,
  startingCash: 1_000_000,
  startingCapacity: 50,
  startingBrand: 20,
  startingFeatures: [0.5, 0.5, 0.5, 0.5] as const,
  marketCapWinThreshold: 50_000_000,
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
  purchaseLogisticK: 2.6, // steepness of the buy-probability curve around a consumer's threshold
} as const;

export const ADOPTION_WEIGHTS = {
  fit: 1.7, // absolute, preference-weighted product quality (how "good enough" it is)
  price: 1.1,
  brand: 0.5,
  wom: 0.9,
  awareness: 0.7,
} as const;

export const MARKET_CAP_MULT = {
  ebitda: 6, // reward real per-turn profitability more
  recurringAnnual: 6,
  customerLtv: 70_000, // installed-base value; lower so grabbing cheap customers isn't an auto-win
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
