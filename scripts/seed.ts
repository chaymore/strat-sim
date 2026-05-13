/**
 * Seed a class + match + AI token against a running server.
 * Useful for fast manual testing of the full multiplayer + LLM flow.
 *
 * Usage:
 *   pnpm dev:server    # in one terminal
 *   pnpm seed          # in another
 */
const SERVER = process.env.STRAT_SIM_URL ?? "http://localhost:3001";

interface ClassResp { classCode: string; instructorToken: string; name: string }
interface MatchResp { matchCode: string; matchId: string; seatCount: number }
interface SeatResp { apiToken: string; matchId: string; companyId: string }

async function postJSON<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${SERVER}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`${path} → ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

async function main() {
  try {
    await fetch(`${SERVER}/health`);
  } catch {
    console.error(`Can't reach server at ${SERVER}. Did you run \`pnpm dev:server\` first?`);
    process.exit(1);
  }

  const startNow = process.argv.includes("--start");

  const cls = await postJSON<ClassResp>("/classes", { name: "Test class" });
  const match = await postJSON<MatchResp>(
    `/classes/${cls.classCode}/matches`,
    { seatCount: 4 },
    cls.instructorToken,
  );
  const seat = await postJSON<SeatResp>(
    `/api/llm/matches/${match.matchCode}/seat`,
    { name: "Sample LLM" },
    cls.instructorToken,
  );
  if (startNow) {
    await postJSON(
      `/matches/${match.matchCode}/start`,
      {},
      cls.instructorToken,
    );
  }

  const webUrl = process.env.STRAT_SIM_WEB ?? "http://localhost:5173";
  const out = [
    "",
    "═══ strat-sim seed ═══",
    "",
    `Class code:        ${cls.classCode}`,
    `Match code:        ${match.matchCode}`,
    `Match id:          ${match.matchId}`,
    `Instructor token:  ${cls.instructorToken}`,
    `AI agent token:    ${seat.apiToken}`,
    "",
    "─── Try it ───",
    "",
    "Two-browser test:",
    `  1. Open ${webUrl}/#/lobby/${match.matchCode} — but first POST a join`,
    `  2. Or just open ${webUrl} in two browser windows`,
    `     • Window A: \"Join a class\" → match code ${match.matchCode}, name Alice`,
    `     • Window B: \"Join a class\" → match code ${match.matchCode}, name Bob`,
    `     • In window A, click \"Start match\". Empty seats fill with bots.`,
    "",
    "Instructor dashboard:",
    `  ${webUrl}/#/instructor/${cls.classCode}`,
    `  (paste the instructor token if your browser session doesn't already have it)`,
    "",
    startNow
      ? "Match is already started (--start). The LLM agent can run immediately."
      : "Tip: rerun with `pnpm seed --start` to skip the lobby and run the LLM agent solo.",
    "",
    "LLM agent test:",
    `  export STRAT_SIM_URL=${SERVER}`,
    `  export STRAT_SIM_MATCH=${match.matchId}`,
    `  export STRAT_SIM_TOKEN=${seat.apiToken}`,
    `  python examples/python/strat_sim_agent.py`,
    "",
    "Quick curl observe:",
    `  curl -s -H 'authorization: Bearer ${seat.apiToken}' \\`,
    `    ${SERVER}/api/llm/matches/${match.matchId}/observe | jq`,
    "",
  ].join("\n");
  console.log(out);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
