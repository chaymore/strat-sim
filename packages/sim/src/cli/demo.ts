import { createGame, resolveTurn, submitDecision, buildObservation } from "../index.js";
import { appleBot, costcoBot, randomBot, whoopBot } from "../bots/index.js";
import { DEFAULTS } from "@strat-sim/shared";
import type { ObservationView, TurnDecision } from "@strat-sim/shared";

type BotFn = (v: ObservationView) => TurnDecision;

const bots: Record<string, BotFn> = {
  costco: costcoBot,
  apple: appleBot,
  whoop: whoopBot,
  random: randomBot,
};

function fmt(n: number): string {
  return Math.round(n).toLocaleString();
}

function runMatch(seed: number, lineup: { id: string; name: string; bot: string }[]): string {
  const game = createGame({
    matchId: `demo-${seed}`,
    seed,
    numConsumers: DEFAULTS.numConsumers,
    maxTurns: DEFAULTS.maxTurns,
    marketCapWinThreshold: DEFAULTS.marketCapWinThreshold,
    companies: lineup.map(({ id, name }) => ({ id, name })),
  });

  while (game.phase === "decision") {
    for (const entry of lineup) {
      const view = buildObservation(game, entry.id);
      const bot = bots[entry.bot];
      if (!bot) throw new Error(`no bot named ${entry.bot}`);
      submitDecision(game, bot(view));
    }
    resolveTurn(game);
  }

  const lines: string[] = [];
  lines.push(`\n=== Match seed=${seed} ended turn ${game.turn} ===`);
  for (const entry of lineup) {
    const co = game.companies[entry.id]!;
    const last = co.history.at(-1);
    lines.push(
      `  ${entry.name.padEnd(8)} share=${((last?.marketShare ?? 0) * 100).toFixed(1)}% ` +
        `cap=$${fmt(last?.marketCap ?? 0).padStart(12)} ` +
        `cash=$${fmt(co.cash).padStart(12)} ` +
        `customers=${co.customers}`,
    );
  }
  const winnerName = game.winnerId
    ? lineup.find((e) => e.id === game.winnerId)?.name
    : "(no winner)";
  lines.push(`  WINNER: ${winnerName}`);
  return lines.join("\n");
}

const matches = 5;
const lineup = [
  { id: "low", name: "Costco", bot: "costco" },
  { id: "prem", name: "Apple", bot: "apple" },
  { id: "niche", name: "Whoop", bot: "whoop" },
  { id: "rand", name: "Random", bot: "random" },
];

const wins: Record<string, number> = {};
for (let i = 0; i < matches; i++) {
  const out = runMatch(2000 + i, lineup);
  console.log(out);
  // crude winner extraction
  const m = out.match(/WINNER: (\S+)/);
  if (m && m[1]) wins[m[1]] = (wins[m[1]] ?? 0) + 1;
}

console.log("\n=== Win counts ===");
console.log(wins);
