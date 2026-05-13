import type { ObservationView, TurnDecision } from "@strat-sim/shared";

/** Premium: heavy R&D on capability + design, premium price. */
export function appleBot(view: ObservationView): TurnDecision {
  const cash = view.you.cash;
  const turnsLeft = Math.max(1, view.maxTurns - view.turn);
  const budget = cash / turnsLeft;
  const mkt = Math.floor(budget * 0.3);
  const cap = Math.floor((budget * 0.15) / 200);
  const rdSpend = Math.floor((budget * 0.45) / 10_000);

  return {
    companyId: view.you.id,
    price: 599,
    subscriptionPrice: 0,
    rd: {
      privacy: Math.floor(rdSpend * 0.1),
      capability: Math.floor(rdSpend * 0.45),
      design: Math.floor(rdSpend * 0.4),
      wellness: Math.floor(rdSpend * 0.05),
    },
    marketing: { total: mkt, segmentTarget: "design" },
    capacityInvestment: cap,
    positioningStatement: "Beautifully smart",
  };
}
