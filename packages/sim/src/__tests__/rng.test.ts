import { describe, expect, it } from "vitest";
import { Rng } from "../rng.js";

describe("Rng", () => {
  it("is deterministic for the same seed", () => {
    const a = new Rng(42);
    const b = new Rng(42);
    for (let i = 0; i < 100; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it("produces different streams for different seeds", () => {
    const a = new Rng(1);
    const b = new Rng(2);
    let same = 0;
    for (let i = 0; i < 50; i++) if (a.next() === b.next()) same++;
    expect(same).toBeLessThan(5);
  });

  it("range stays within bounds", () => {
    const r = new Rng(7);
    for (let i = 0; i < 200; i++) {
      const v = r.range(10, 20);
      expect(v).toBeGreaterThanOrEqual(10);
      expect(v).toBeLessThan(20);
    }
  });
});
