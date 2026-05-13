import type { ObservationView, TurnDecision } from "@strat-sim/shared";

export type Bot = (view: ObservationView) => TurnDecision;

export { costcoBot } from "./costco.js";
export { appleBot } from "./apple.js";
export { whoopBot } from "./whoop.js";
export { randomBot } from "./random.js";
