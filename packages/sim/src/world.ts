import {
  DEFAULTS,
  NUM_AXES,
  type CompanyId,
  type Company,
  type Consumer,
  type FeatureVector,
  type GameState,
  type MatchConfig,
} from "@strat-sim/shared";
import { Rng } from "./rng.js";

/** Four latent customer segments, each with prefs centered on one axis. */
const SEGMENT_CENTERS: FeatureVector[] = [
  [0.7, 0.3, 0.4, 0.4], // privacy-first
  [0.3, 0.8, 0.5, 0.4], // power users
  [0.4, 0.4, 0.8, 0.3], // fashion-forward
  [0.5, 0.4, 0.4, 0.8], // wellness/health
];

const SEGMENT_PRICE_RANGE: [number, number][] = [
  [180, 420],
  [350, 800],
  [220, 600],
  [200, 550],
];

function normalize(v: number[]): FeatureVector {
  const sum = v.reduce((a, b) => a + b, 0) || 1;
  const r = v.map((x) => x / sum) as number[];
  return [r[0]!, r[1]!, r[2]!, r[3]!] as const;
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export function createConsumers(rng: Rng, n: number): Consumer[] {
  const out: Consumer[] = [];
  const { width, height } = DEFAULTS.worldSize;

  for (let i = 0; i < n; i++) {
    const segIdx = rng.int(0, SEGMENT_CENTERS.length);
    const center = SEGMENT_CENTERS[segIdx]!;
    const noisy: number[] = [];
    for (let a = 0; a < NUM_AXES; a++) {
      noisy.push(clamp01(center[a]! + rng.normal(0, 0.12)));
    }
    const prefs = normalize(noisy);

    const [pmin, pmax] = SEGMENT_PRICE_RANGE[segIdx]!;
    const priceCeiling = rng.range(pmin, pmax);

    // Light clustering: each segment hangs out in a quadrant, with overlap.
    const cx = (segIdx % 2) * width * 0.5 + width * 0.25;
    const cy = Math.floor(segIdx / 2) * height * 0.5 + height * 0.25;
    const x = clamp01((cx + rng.normal(0, width * 0.18)) / width) * width;
    const y = clamp01((cy + rng.normal(0, height * 0.18)) / height) * height;

    out.push({
      id: `c${i}`,
      position: { x, y },
      prefs,
      priceCeiling,
      adopted: null,
      subscribed: false,
      awareness: {},
    });
  }
  return out;
}

export function createCompany(id: CompanyId, name: string): Company {
  return {
    id,
    name,
    archetype: "neutral",
    cash: DEFAULTS.startingCash,
    capacity: DEFAULTS.startingCapacity,
    rdPoints: 0,
    brandReputation: DEFAULTS.startingBrand,
    product: {
      features: [...DEFAULTS.startingFeatures] as unknown as FeatureVector,
      price: 300,
      subscriptionPrice: 0,
    },
    customers: 0,
    subscribers: 0,
    history: [],
  };
}

export function createGame(config: MatchConfig): GameState {
  const rng = new Rng(config.seed);
  const consumers = createConsumers(rng, config.numConsumers);
  const companies: Record<CompanyId, Company> = {};
  for (const c of config.companies) {
    companies[c.id] = createCompany(c.id, c.name);
  }
  return {
    config,
    turn: 0,
    phase: "decision",
    companies,
    consumers,
    pendingDecisions: {},
    winnerId: null,
    log: [`Match ${config.matchId} created with ${consumers.length} consumers`],
  };
}
