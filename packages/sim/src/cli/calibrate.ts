/**
 * Calibration harness.
 *
 * Runs many bot-vs-bot matches across a deterministic range of seeds and prints
 * a balance report. Used to sanity-check the simulation tuning (e.g. after the
 * customerLtv / Bass-diffusion changes) by measuring:
 *
 *   1. Win market-cap distribution (min/median/mean/p90/max).
 *   2. Turn-of-win distribution (threshold wins vs. final-turn decisions).
 *   3. Winner-vs-field spread (winner cap / median competitor, winner / runner-up).
 *   4. Adoption curve (avg fraction of consumers adopted per turn).
 *   5. Win counts by bot archetype.
 *
 * Deterministic for a fixed seed range. Configure match count with the
 * CALIB_MATCHES env var or first CLI arg; defaults to 50. Seeds are 4000 + i.
 *
 * Run:  pnpm sim:calibrate   (or CALIB_MATCHES=100 pnpm sim:calibrate)
 */
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

// Same 4-archetype lineup the demo uses.
const lineup = [
  { id: "low", name: "Costco", bot: "costco" },
  { id: "prem", name: "Apple", bot: "apple" },
  { id: "niche", name: "Whoop", bot: "whoop" },
  { id: "rand", name: "Random", bot: "random" },
] as const;

// --- Config -----------------------------------------------------------------

const NUM_CONSUMERS = DEFAULTS.numConsumers; // 600
const MAX_TURNS = DEFAULTS.maxTurns; // 10
const WIN_THRESHOLD = DEFAULTS.marketCapWinThreshold; // 50M
const SEED_BASE = 4000;

const MATCHES = Number(process.env.CALIB_MATCHES ?? process.argv[2] ?? 50);

// --- Per-match result --------------------------------------------------------

interface MatchResult {
  seed: number;
  endedTurn: number; // game.turn the match ended on
  winnerId: string | null; // null => no one crossed the threshold
  winnerBot: string | null;
  /** Whether the win came from crossing the cap threshold before the final turn. */
  thresholdWin: boolean;
  /** Final market cap for every company, keyed by company id. */
  finalCaps: Record<string, number>;
  /** Final market cap of the leader (max), regardless of whether anyone "won". */
  leaderCap: number;
  /** Per-turn adopted fraction (index 0 == turn 1). Length == endedTurn. */
  adoptedFraction: number[];
}

function runMatch(seed: number): MatchResult {
  const game = createGame({
    matchId: `calib-${seed}`,
    seed,
    numConsumers: NUM_CONSUMERS,
    maxTurns: MAX_TURNS,
    marketCapWinThreshold: WIN_THRESHOLD,
    companies: lineup.map(({ id, name }) => ({ id, name })),
  });

  // Record the adoption curve as we go: fraction of the consumer pool that has
  // adopted *anything* at the end of each resolved turn.
  const adoptedFraction: number[] = [];

  while (game.phase === "decision") {
    for (const entry of lineup) {
      const view = buildObservation(game, entry.id);
      const bot = bots[entry.bot];
      if (!bot) throw new Error(`no bot named ${entry.bot}`);
      submitDecision(game, bot(view));
    }
    resolveTurn(game);

    const adopted = game.consumers.filter((c) => c.adopted !== null).length;
    adoptedFraction.push(adopted / NUM_CONSUMERS);
  }

  const finalCaps: Record<string, number> = {};
  let leaderCap = 0;
  for (const entry of lineup) {
    const co = game.companies[entry.id]!;
    const cap = co.history.at(-1)?.marketCap ?? 0;
    finalCaps[entry.id] = cap;
    if (cap > leaderCap) leaderCap = cap;
  }

  const winnerId = game.winnerId;
  const winnerBot = winnerId ? lineup.find((e) => e.id === winnerId)?.bot ?? null : null;
  // A threshold win is one that landed before the scheduled final turn. If the
  // game ran all the way to MAX_TURNS, the winner (if any) was decided at the end.
  const thresholdWin = winnerId !== null && game.turn < MAX_TURNS;

  return {
    seed,
    endedTurn: game.turn,
    winnerId,
    winnerBot,
    thresholdWin,
    finalCaps,
    leaderCap,
    adoptedFraction,
  };
}

// --- Stats helpers -----------------------------------------------------------

function quantile(sortedAsc: number[], q: number): number {
  if (sortedAsc.length === 0) return 0;
  if (sortedAsc.length === 1) return sortedAsc[0]!;
  const pos = (sortedAsc.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sortedAsc[lo]!;
  const frac = pos - lo;
  return sortedAsc[lo]! * (1 - frac) + sortedAsc[hi]! * frac;
}

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function fmtMoney(n: number): string {
  return "$" + Math.round(n).toLocaleString();
}

function fmtPct(frac: number): string {
  return (frac * 100).toFixed(1) + "%";
}

// --- Run all matches ---------------------------------------------------------

const results: MatchResult[] = [];
for (let i = 0; i < MATCHES; i++) {
  results.push(runMatch(SEED_BASE + i));
}

// --- Report ------------------------------------------------------------------

const out: string[] = [];
const hr = "-".repeat(64);

out.push(hr);
out.push(`CALIBRATION REPORT  (${MATCHES} matches, seeds ${SEED_BASE}..${SEED_BASE + MATCHES - 1})`);
out.push(
  `lineup: ${lineup.map((l) => `${l.name}/${l.bot}`).join(", ")}  | ` +
    `consumers=${NUM_CONSUMERS} maxTurns=${MAX_TURNS} winThreshold=${fmtMoney(WIN_THRESHOLD)}`,
);
out.push(hr);

// 1. Win market-cap distribution -- the winner's final cap (only decided matches).
const winnerCaps = results
  .filter((r) => r.winnerId !== null)
  .map((r) => r.finalCaps[r.winnerId!]!)
  .sort((a, b) => a - b);
const noWinner = results.filter((r) => r.winnerId === null).length;

out.push("");
out.push("1) WIN MARKET-CAP DISTRIBUTION (winner's final cap)");
if (winnerCaps.length === 0) {
  out.push("   (no matches had a winner)");
} else {
  out.push(`   matches with a winner: ${winnerCaps.length} / ${MATCHES}` + (noWinner ? `  (${noWinner} had no winner)` : ""));
  out.push(`   min    = ${fmtMoney(winnerCaps[0]!)}`);
  out.push(`   median = ${fmtMoney(quantile(winnerCaps, 0.5))}`);
  out.push(`   mean   = ${fmtMoney(mean(winnerCaps))}`);
  out.push(`   p90    = ${fmtMoney(quantile(winnerCaps, 0.9))}`);
  out.push(`   max    = ${fmtMoney(winnerCaps[winnerCaps.length - 1]!)}`);
  out.push(`   (win threshold for reference: ${fmtMoney(WIN_THRESHOLD)})`);
}

// 2. Turn-of-win distribution.
const thresholdWins = results.filter((r) => r.thresholdWin).length;
const finalTurnDecided = results.filter((r) => !r.thresholdWin).length;
// Histogram of the turn each *decided* match ended on.
const turnHist: Record<number, number> = {};
for (const r of results) {
  if (r.winnerId !== null) turnHist[r.endedTurn] = (turnHist[r.endedTurn] ?? 0) + 1;
}

out.push("");
out.push("2) TURN-OF-WIN DISTRIBUTION");
out.push(`   threshold wins before final turn : ${thresholdWins} / ${MATCHES}`);
out.push(`   decided at/after final turn       : ${finalTurnDecided} / ${MATCHES}` + (noWinner ? `  (incl. ${noWinner} with no winner)` : ""));
out.push("   histogram of winning turn (matches that had a winner):");
const turnKeys = Object.keys(turnHist)
  .map(Number)
  .sort((a, b) => a - b);
if (turnKeys.length === 0) {
  out.push("     (none)");
} else {
  const maxCount = Math.max(...turnKeys.map((t) => turnHist[t]!));
  for (let t = 1; t <= MAX_TURNS; t++) {
    const c = turnHist[t] ?? 0;
    if (c === 0 && (t < (turnKeys[0] ?? 1) || t > (turnKeys[turnKeys.length - 1] ?? MAX_TURNS))) continue;
    const bar = "#".repeat(Math.round((c / maxCount) * 30));
    out.push(`     turn ${String(t).padStart(2)} : ${String(c).padStart(3)} ${bar}`);
  }
}

// 3. Winner-vs-field spread.
const ratioToMedian: number[] = [];
const ratioToRunnerUp: number[] = [];
for (const r of results) {
  if (r.winnerId === null) continue;
  const winnerCap = r.finalCaps[r.winnerId]!;
  const others = Object.entries(r.finalCaps)
    .filter(([id]) => id !== r.winnerId)
    .map(([, cap]) => cap)
    .sort((a, b) => a - b);
  if (others.length === 0) continue;
  const medianOther = quantile(others, 0.5);
  const runnerUp = others[others.length - 1]!; // best of the rest
  if (medianOther > 0) ratioToMedian.push(winnerCap / medianOther);
  if (runnerUp > 0) ratioToRunnerUp.push(winnerCap / runnerUp);
}
ratioToMedian.sort((a, b) => a - b);
ratioToRunnerUp.sort((a, b) => a - b);

out.push("");
out.push("3) WINNER-VS-FIELD SPREAD");
if (ratioToMedian.length === 0) {
  out.push("   (no decided matches to measure)");
} else {
  out.push(
    `   winner cap / median competitor : median ${quantile(ratioToMedian, 0.5).toFixed(2)}x  ` +
      `mean ${mean(ratioToMedian).toFixed(2)}x  max ${ratioToMedian[ratioToMedian.length - 1]!.toFixed(2)}x`,
  );
  out.push(
    `   winner cap / runner-up         : median ${quantile(ratioToRunnerUp, 0.5).toFixed(2)}x  ` +
      `mean ${mean(ratioToRunnerUp).toFixed(2)}x  max ${ratioToRunnerUp[ratioToRunnerUp.length - 1]!.toFixed(2)}x`,
  );
}

// 4. Adoption curve -- average adopted fraction per turn across all matches.
out.push("");
out.push("4) ADOPTION CURVE (avg fraction of consumers adopted, by turn)");
for (let t = 1; t <= MAX_TURNS; t++) {
  const vals = results
    .map((r) => r.adoptedFraction[t - 1])
    .filter((v): v is number => v !== undefined);
  if (vals.length === 0) continue;
  const avg = mean(vals);
  const bar = "#".repeat(Math.round(avg * 40));
  out.push(`   turn ${String(t).padStart(2)} : ${fmtPct(avg).padStart(6)} ${bar}`);
}

// 5. Win counts by bot archetype.
const winsByBot: Record<string, number> = {};
for (const l of lineup) winsByBot[l.bot] = 0;
for (const r of results) {
  if (r.winnerBot) winsByBot[r.winnerBot] = (winsByBot[r.winnerBot] ?? 0) + 1;
}

out.push("");
out.push("5) WIN COUNTS BY BOT ARCHETYPE");
for (const l of lineup) {
  const c = winsByBot[l.bot] ?? 0;
  const bar = "#".repeat(c);
  out.push(`   ${l.bot.padEnd(7)} (${l.name.padEnd(7)}) : ${String(c).padStart(3)} ${bar}`);
}
if (noWinner > 0) out.push(`   ${"(none)".padEnd(7)} ${" ".repeat(10)}: ${String(noWinner).padStart(3)}`);

out.push("");
out.push(hr);

console.log(out.join("\n"));
