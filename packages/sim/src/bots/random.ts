import { FEATURE_AXES, type ObservationView, type TurnDecision } from "@strat-sim/shared";
import { Rng } from "../rng.js";

/** Baseline noise opponent. Used to verify the strategy bots beat random play. */
export function randomBot(view: ObservationView): TurnDecision {
  const rng = new Rng(view.turn * 1000 + hashId(view.you.id));
  const budget = view.you.cash / Math.max(1, view.maxTurns - view.turn);
  const mkt = Math.floor(rng.range(0, budget * 0.5));
  const cap = Math.floor(rng.range(0, budget * 0.3) / 200);
  const rdPts = Math.floor(rng.range(0, budget * 0.3) / 10_000);
  const split = [rng.next(), rng.next(), rng.next(), rng.next()];
  const sum = split.reduce((a, b) => a + b, 0) || 1;

  const targets = ["broad", ...FEATURE_AXES] as const;
  return {
    companyId: view.you.id,
    price: Math.floor(rng.range(150, 700)),
    subscriptionPrice: rng.next() < 0.3 ? Math.floor(rng.range(5, 40)) : 0,
    rd: {
      privacy: Math.floor((rdPts * (split[0] ?? 0)) / sum),
      capability: Math.floor((rdPts * (split[1] ?? 0)) / sum),
      design: Math.floor((rdPts * (split[2] ?? 0)) / sum),
      wellness: Math.floor((rdPts * (split[3] ?? 0)) / sum),
    },
    marketing: { total: mkt, segmentTarget: rng.pick(targets) },
    capacityInvestment: cap,
    positioningStatement: "Random vibes",
  };
}

function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
