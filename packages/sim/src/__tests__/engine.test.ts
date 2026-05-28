import { describe, expect, it } from "vitest";
import { createGame } from "../world.js";
import { resolveTurn, submitDecision } from "../engine.js";
import { buildObservation } from "../observation.js";
import { appleBot, costcoBot, whoopBot, randomBot } from "../bots/index.js";
import type { TurnDecision } from "@strat-sim/shared";

function fixedDecision(id: string): TurnDecision {
  return {
    companyId: id,
    price: 300,
    subscriptionPrice: 0,
    rd: { privacy: 5, capability: 5, design: 5, wellness: 5 },
    marketing: { total: 50_000, segmentTarget: "broad" },
    capacityInvestment: 50,
  };
}

describe("resolveTurn", () => {
  it("advances turn and produces customers", () => {
    const game = createGame({
      matchId: "m",
      seed: 11,
      numConsumers: 200,
      maxTurns: 10,
      marketCapWinThreshold: 999_999_999,
      companies: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
    });
    submitDecision(game, fixedDecision("a"));
    submitDecision(game, fixedDecision("b"));
    const { perCompany } = resolveTurn(game);
    expect(game.turn).toBe(1);
    expect(perCompany.a?.unitsSold).toBeGreaterThan(0);
    expect(perCompany.b?.unitsSold).toBeGreaterThan(0);
  });

  it("respects production capacity", () => {
    const game = createGame({
      matchId: "m",
      seed: 21,
      numConsumers: 250,
      maxTurns: 10,
      marketCapWinThreshold: 999_999_999,
      companies: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
    });
    // A has tiny capacity, B has huge — A's units should never exceed its capacity.
    game.companies.a!.capacity = 5;
    game.companies.b!.capacity = 5_000;
    submitDecision(game, {
      companyId: "a",
      price: 199, // attractive price → high demand
      subscriptionPrice: 0,
      rd: { privacy: 0, capability: 0, design: 0, wellness: 0 },
      marketing: { total: 100_000, segmentTarget: "broad" },
      capacityInvestment: 0,
    });
    submitDecision(game, fixedDecision("b"));
    const { perCompany } = resolveTurn(game);
    expect(perCompany.a?.unitsSold).toBeLessThanOrEqual(5);
  });

  it("holds most of the market back until products prove themselves (diffusion)", () => {
    const game = createGame({
      matchId: "m",
      seed: 7,
      numConsumers: 400,
      maxTurns: 10,
      marketCapWinThreshold: 999_999_999,
      companies: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
    });
    submitDecision(game, fixedDecision("a"));
    submitDecision(game, fixedDecision("b"));
    resolveTurn(game);
    const adopted = game.consumers.filter((c) => c.adopted != null).length;
    // Only early adopters should bite on turn 1 — nowhere near the whole pool.
    expect(adopted).toBeGreaterThan(0);
    expect(adopted).toBeLessThan(game.consumers.length * 0.4);
  });

  it("worn-out products are replaced, generating repeat sales", () => {
    const game = createGame({
      matchId: "m",
      seed: 3,
      numConsumers: 60,
      maxTurns: 10,
      marketCapWinThreshold: 999_999_999,
      companies: [{ id: "a", name: "A" }],
    });
    // Everyone already owns A, bought last turn, and is due to replace now with a
    // low bar so they re-buy rather than lapse.
    for (const c of game.consumers) {
      c.adopted = "a";
      c.subscribed = false;
      c.purchaseTurn = 0;
      c.replacementInterval = 1;
      c.adoptionThreshold = 0.4;
      c.priceCeiling = 1000;
    }
    game.companies.a!.capacity = 1000;
    submitDecision(game, fixedDecision("a"));
    const { perCompany } = resolveTurn(game);
    // No net new customers are possible (everyone already owns A), yet units ship
    // because worn-out products are being replaced.
    expect(perCompany.a?.unitsSold).toBeGreaterThan(0);
  });

  it("ends the game when a company crosses the market cap threshold", () => {
    const game = createGame({
      matchId: "m",
      seed: 99,
      numConsumers: 150,
      maxTurns: 10,
      marketCapWinThreshold: 1, // anyone with positive cap wins
      companies: [{ id: "a", name: "Solo" }],
    });
    submitDecision(game, fixedDecision("a"));
    resolveTurn(game);
    expect(game.phase).toBe("ended");
    expect(game.winnerId).toBe("a");
  });

  it("ends after maxTurns even without threshold", () => {
    const game = createGame({
      matchId: "m",
      seed: 5,
      numConsumers: 100,
      maxTurns: 3,
      marketCapWinThreshold: 9_999_999_999,
      companies: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
    });
    for (let i = 0; i < 3; i++) {
      submitDecision(game, fixedDecision("a"));
      submitDecision(game, fixedDecision("b"));
      resolveTurn(game);
    }
    expect(game.phase).toBe("ended");
    expect(game.winnerId).not.toBeNull();
  });

  it("sanitizes overspending — cash never goes catastrophically negative on first turn", () => {
    const game = createGame({
      matchId: "m",
      seed: 12,
      numConsumers: 100,
      maxTurns: 10,
      marketCapWinThreshold: 9_999_999_999,
      companies: [{ id: "a", name: "A" }],
    });
    submitDecision(game, {
      companyId: "a",
      price: 300,
      subscriptionPrice: 0,
      rd: { privacy: 9999, capability: 9999, design: 9999, wellness: 9999 },
      marketing: { total: 50_000_000, segmentTarget: "broad" },
      capacityInvestment: 99999,
    });
    resolveTurn(game);
    // Started with $1M; the most they can have lost is roughly that (plus revenue earned).
    expect(game.companies.a!.cash).toBeGreaterThan(-200_000);
  });

  it("strategy bots beat random bots more than half the time", () => {
    const wins = { strategy: 0, random: 0, ties: 0 };
    const matches = 12;
    for (let s = 0; s < matches; s++) {
      const game = createGame({
        matchId: `m${s}`,
        seed: 1000 + s,
        numConsumers: 250,
        maxTurns: 10,
        marketCapWinThreshold: 50_000_000,
        companies: [
          { id: "low", name: "Costco" },
          { id: "prem", name: "Apple" },
          { id: "niche", name: "Whoop" },
          { id: "rand", name: "Random" },
        ],
      });
      const bots = {
        low: costcoBot,
        prem: appleBot,
        niche: whoopBot,
        rand: randomBot,
      };
      while (game.phase === "decision") {
        for (const id of Object.keys(game.companies)) {
          const view = buildObservation(game, id);
          const bot = bots[id as keyof typeof bots];
          submitDecision(game, bot(view));
        }
        resolveTurn(game);
      }
      const winner = game.winnerId;
      if (winner === "rand") wins.random++;
      else if (winner) wins.strategy++;
      else wins.ties++;
    }
    expect(wins.strategy).toBeGreaterThan(wins.random);
  });
});
