import { describe, expect, it } from "vitest";
import { createGame } from "../world.js";

describe("createGame", () => {
  it("creates the requested number of consumers", () => {
    const g = createGame({
      matchId: "m1",
      seed: 1,
      numConsumers: 250,
      maxTurns: 10,
      marketCapWinThreshold: 50_000_000,
      companies: [
        { id: "p1", name: "Alpha" },
        { id: "p2", name: "Beta" },
      ],
    });
    expect(g.consumers).toHaveLength(250);
    expect(Object.keys(g.companies)).toEqual(["p1", "p2"]);
    g.consumers.forEach((c) => {
      const sum = c.prefs.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 5);
      expect(c.priceCeiling).toBeGreaterThan(100);
      expect(c.adopted).toBeNull();
    });
  });

  it("is deterministic given a seed", () => {
    const cfg = {
      matchId: "m",
      seed: 7,
      numConsumers: 50,
      maxTurns: 10,
      marketCapWinThreshold: 1,
      companies: [{ id: "p1", name: "A" }],
    };
    const a = createGame(cfg);
    const b = createGame(cfg);
    expect(a.consumers[0]?.priceCeiling).toBe(b.consumers[0]?.priceCeiling);
    expect(a.consumers[10]?.position).toEqual(b.consumers[10]?.position);
  });
});
