import type { Consumer } from "@strat-sim/shared";

/**
 * Precomputed k-nearest-neighbor index for word-of-mouth lookups.
 * Consumers don't move enough turn-to-turn to invalidate this for v0.1.
 */
export class NeighborIndex {
  private readonly neighbors: number[][];

  constructor(consumers: Consumer[], k: number) {
    this.neighbors = consumers.map((c) => {
      const dists = consumers.map((other, idx) => {
        const dx = c.position.x - other.position.x;
        const dy = c.position.y - other.position.y;
        return { idx, d2: dx * dx + dy * dy };
      });
      dists.sort((a, b) => a.d2 - b.d2);
      // skip self at index 0
      return dists.slice(1, k + 1).map((x) => x.idx);
    });
  }

  neighborsOf(i: number): number[] {
    return this.neighbors[i] ?? [];
  }
}
