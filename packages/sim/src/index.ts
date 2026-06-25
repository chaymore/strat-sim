export { Rng } from "./rng.js";
export { NeighborIndex } from "./neighbors.js";
export { createGame, createCompany, createConsumers } from "./world.js";
export {
  resolveTurn,
  submitDecision,
  allDecisionsIn,
  sanitizeDecision,
} from "./engine.js";
export type { ResolveResult, ResolvedCompany } from "./engine.js";
export { buildObservation } from "./observation.js";
export {
  computeMarketCap,
  computeMarketShare,
  computeTurnFinancials,
  sumRD,
} from "./finance.js";
export { rollAdoptions, utilitiesFor } from "./adoption.js";
export {
  frontier,
  frontierVector,
  axisBuildCost,
  unitCost,
  growCapabilities,
  clampToFrontier,
} from "./production.js";
