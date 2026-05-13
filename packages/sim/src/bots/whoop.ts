import type { ObservationView, TurnDecision } from "@strat-sim/shared";

/** Niche wellness + privacy with subscription model. */
export function whoopBot(view: ObservationView): TurnDecision {
  const cash = view.you.cash;
  const turnsLeft = Math.max(1, view.maxTurns - view.turn);
  const budget = cash / turnsLeft;
  const mkt = Math.floor(budget * 0.3);
  const cap = Math.floor((budget * 0.2) / 200);
  const rdSpend = Math.floor((budget * 0.4) / 10_000);

  return {
    companyId: view.you.id,
    price: 299,
    subscriptionPrice: 25,
    rd: {
      privacy: Math.floor(rdSpend * 0.35),
      capability: Math.floor(rdSpend * 0.1),
      design: Math.floor(rdSpend * 0.1),
      wellness: Math.floor(rdSpend * 0.45),
    },
    marketing: { total: mkt, segmentTarget: "wellness" },
    capacityInvestment: cap,
    positioningStatement: "Your private wellness coach",
  };
}
