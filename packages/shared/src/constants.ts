export const FEATURE_AXES = ["privacy", "capability", "design", "wellness"] as const;
export type FeatureAxis = (typeof FEATURE_AXES)[number];

export const NUM_AXES = FEATURE_AXES.length;

export const DEFAULTS = {
  numConsumers: 250,
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
  switcherFraction: 0.1, // fraction of existing customers that re-evaluate each turn
} as const;

export const ADOPTION_WEIGHTS = {
  fit: 1.6,
  price: 1.2,
  brand: 0.4,
  wom: 0.9,
  awareness: 0.7,
  noAdoptUtility: 1.0,
} as const;

export const MARKET_CAP_MULT = {
  ebitda: 5,
  recurringAnnual: 8,
  customerLtv: 180_000,
  brandFloor: 50,
  rdPipeline: 80_000,
  growthCap: 8_000_000,
} as const;
