import type { ObservationView, TurnDecision } from "@strat-sim/shared";

/** Low cost, high capacity, broad marketing. */
export function costcoBot(view: ObservationView): TurnDecision {
  const cash = view.you.cash;
  const turnsLeft = Math.max(1, view.maxTurns - view.turn);
  const budget = cash / turnsLeft;
  const mkt = Math.floor(budget * 0.35);
  const cap = Math.floor((budget * 0.4) / 200);
  const rdSpend = Math.floor((budget * 0.2) / 10_000);

  return {
    companyId: view.you.id,
    price: 199,
    subscriptionPrice: 0,
    rd: {
      privacy: Math.floor(rdSpend * 0.25),
      capability: Math.floor(rdSpend * 0.25),
      design: Math.floor(rdSpend * 0.25),
      wellness: Math.floor(rdSpend * 0.25),
    },
    marketing: { total: mkt, segmentTarget: "broad" },
    capacityInvestment: cap,
    positioningStatement: "Smart AI for everyone",
  };
}
