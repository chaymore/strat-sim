import type {
  CompanyId,
  GameState,
  ObservationView,
  PrivateCompanyView,
  PublicCompanyView,
  PublicConsumerView,
} from "@strat-sim/shared";

export function buildObservation(state: GameState, asCompanyId: CompanyId): ObservationView {
  const me = state.companies[asCompanyId];
  if (!me) throw new Error(`Unknown company ${asCompanyId}`);
  const totalCustomers = Object.values(state.companies).reduce((s, c) => s + c.customers, 0) || 1;

  const you: PrivateCompanyView = {
    id: me.id,
    name: me.name,
    archetype: me.archetype,
    product: me.product,
    customers: me.customers,
    subscribers: me.subscribers,
    marketShare: me.customers / totalCustomers,
    brandReputation: me.brandReputation,
    marketCap: me.history.at(-1)?.marketCap ?? 0,
    cash: me.cash,
    capacity: me.capacity,
    rdPoints: me.rdPoints,
    history: me.history.slice(),
  };

  const competitors: PublicCompanyView[] = Object.values(state.companies)
    .filter((c) => c.id !== asCompanyId)
    .map((c) => ({
      id: c.id,
      name: c.name,
      archetype: c.archetype,
      product: c.product,
      customers: c.customers,
      subscribers: c.subscribers,
      marketShare: c.customers / totalCustomers,
      brandReputation: c.brandReputation,
      marketCap: c.history.at(-1)?.marketCap ?? 0,
    }));

  const consumers: PublicConsumerView[] = state.consumers.map((c) => ({
    id: c.id,
    position: c.position,
    adopted: c.adopted,
  }));

  return {
    matchId: state.config.matchId,
    turn: state.turn,
    phase: state.phase,
    maxTurns: state.config.maxTurns,
    marketCapWinThreshold: state.config.marketCapWinThreshold,
    you,
    competitors,
    consumers,
    log: state.log.slice(-20),
  };
}
