import { create } from "zustand";
import {
  buildObservation,
  createGame,
  resolveTurn,
  submitDecision,
} from "@strat-sim/sim";
import { appleBot, costcoBot, whoopBot } from "@strat-sim/sim/bots";
import type {
  CompanyId,
  Consumer,
  GameState,
  ObservationView,
  TurnDecision,
} from "@strat-sim/shared";

const HUMAN_ID = "you";

const lineup = [
  { id: HUMAN_ID, name: "You" },
  { id: "low", name: "ValueWear" },
  { id: "prem", name: "Halo" },
  { id: "niche", name: "Pulse" },
];

const bots: Record<string, (v: ObservationView) => TurnDecision> = {
  low: costcoBot,
  prem: appleBot,
  niche: whoopBot,
};

interface Store {
  game: GameState;
  observation: ObservationView;
  rawConsumers: Consumer[];
  selectedConsumerId: string | null;
  newMatch: (seed?: number) => void;
  submitHumanTurn: (decision: TurnDecision) => void;
  setSelectedConsumer: (id: string | null) => void;
}

function freshGame(seed: number): GameState {
  return createGame({
    matchId: `local-${seed}`,
    seed,
    numConsumers: 250,
    maxTurns: 10,
    marketCapWinThreshold: 50_000_000,
    companies: lineup.map(({ id, name }) => ({ id, name })),
  });
}

export const useGame = create<Store>((set, get) => {
  const initial = freshGame(Date.now() & 0xffff);
  return {
    game: initial,
    observation: buildObservation(initial, HUMAN_ID),
    rawConsumers: initial.consumers.slice(),
    selectedConsumerId: null,
    newMatch: (seed) => {
      const g = freshGame(seed ?? (Date.now() & 0xffff));
      set({
        game: g,
        observation: buildObservation(g, HUMAN_ID),
        rawConsumers: g.consumers.slice(),
        selectedConsumerId: null,
      });
    },
    submitHumanTurn: (decision) => {
      const { game } = get();
      if (game.phase !== "decision") return;
      submitDecision(game, { ...decision, companyId: HUMAN_ID });
      for (const id of Object.keys(bots)) {
        const view = buildObservation(game, id);
        const bot = bots[id]!;
        submitDecision(game, bot(view));
      }
      resolveTurn(game);
      set({
        observation: buildObservation(game, HUMAN_ID),
        rawConsumers: game.consumers.slice(),
      });
    },
    setSelectedConsumer: (id) => set({ selectedConsumerId: id }),
  };
});

export const HUMAN_COMPANY_ID: CompanyId = HUMAN_ID;
