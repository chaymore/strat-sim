import { describe, expect, it } from "vitest";
import { createGame } from "../world.js";
import { resolveTurn, submitDecision } from "../engine.js";
import { buildObservation } from "../observation.js";
import type { TurnDecision } from "@strat-sim/shared";

function decision(id: string): TurnDecision {
  return {
    companyId: id,
    price: 300,
    subscriptionPrice: 0,
    rd: { privacy: 5, capability: 5, design: 5, wellness: 5 },
    marketing: { total: 50_000, segmentTarget: "broad" },
    capacityInvestment: 50,
  };
}

describe("buildObservation", () => {
  it("exposes segment intel and market totals the UI relies on", () => {
    const game = createGame({
      matchId: "m",
      seed: 4,
      numConsumers: 300,
      maxTurns: 10,
      marketCapWinThreshold: 999_999_999,
      companies: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
    });
    const obs = buildObservation(game, "a");
    expect(obs.segments).toHaveLength(4);
    expect(obs.totalMarket).toBe(300);
    expect(obs.totalAdopted).toBe(0);
    const seg = obs.segments[0]!;
    expect(seg.size).toBeGreaterThan(0);
    expect(seg.prefs).toHaveLength(4);
    expect(seg.medianPriceCeiling).toBeGreaterThan(0);
  });

  it("includes competitor history and per-turn units/demand after a turn", () => {
    const game = createGame({
      matchId: "m",
      seed: 4,
      numConsumers: 300,
      maxTurns: 10,
      marketCapWinThreshold: 999_999_999,
      companies: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
    });
    submitDecision(game, decision("a"));
    submitDecision(game, decision("b"));
    resolveTurn(game);
    const obs = buildObservation(game, "a");
    expect(obs.you.history.at(-1)).toBeDefined();
    expect(obs.you.history.at(-1)!.unitsSold).toBeGreaterThanOrEqual(0);
    expect(obs.you.history.at(-1)!.demand).toBeGreaterThanOrEqual(obs.you.history.at(-1)!.unitsSold);
    expect(obs.competitors[0]!.history.length).toBe(1);
    expect(obs.totalAdopted).toBeGreaterThan(0);
  });
});
