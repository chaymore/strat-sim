import { useCallback, useEffect, useState } from "react";
import { Page, Card, Button, Input, ErrorBanner, colors } from "../ui.js";
import { navigate } from "../router.js";
import { createMatch, getDashboard, seatLlm } from "../api.js";
import { useSession } from "../session.js";
import type { MatchAudit, MatchSummary } from "@strat-sim/shared";

export function Dashboard({ classCode }: { classCode: string }) {
  const instructor = useSession((s) => s.instructor);
  const [data, setData] = useState<{ className: string; matches: MatchAudit[]; summaries: MatchSummary[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [llmName, setLlmName] = useState("GPT-4");
  const [llmToken, setLlmToken] = useState<{ matchCode: string; apiToken: string; matchId: string } | null>(null);

  const refresh = useCallback(async () => {
    if (!instructor || instructor.classCode !== classCode) return;
    try {
      const r = await getDashboard(classCode, instructor.instructorToken);
      setData({ className: r.class.name, matches: r.matches, summaries: r.class.matchSummaries });
    } catch (e) {
      setError((e as Error).message);
    }
  }, [classCode, instructor]);

  useEffect(() => {
    if (!instructor || instructor.classCode !== classCode) {
      navigate({ kind: "instructor" });
      return;
    }
    refresh();
    const iv = setInterval(refresh, 3000);
    return () => clearInterval(iv);
  }, [refresh, classCode, instructor]);

  if (!instructor || !data) {
    return (
      <Page>
        <Card title="Loading dashboard…" children={null} />
      </Page>
    );
  }

  async function onCreateMatch() {
    if (!instructor) return;
    setBusy(true);
    try {
      await createMatch(classCode, instructor.instructorToken);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onSeatLlm(matchCode: string) {
    if (!instructor) return;
    setError(null);
    try {
      const r = await seatLlm(matchCode, instructor.instructorToken, llmName);
      setLlmToken({ matchCode, apiToken: r.apiToken, matchId: r.matchId });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const selected = data.matches.find((m) => m.matchId === selectedMatch);

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0 }}>{data.className}</h1>
          <div style={{ marginTop: 4, color: colors.textDim }}>
            Class code <strong style={{ color: colors.text, letterSpacing: 1 }}>{classCode}</strong>{" "}
            — share with students to join.
          </div>
        </div>
        <Button onClick={() => navigate({ kind: "landing" })} variant="ghost" style={{ width: "auto" }}>
          Back
        </Button>
      </header>

      <ErrorBanner message={error} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 20 }}>
        <section>
          <Card title="Matches" subtitle="Create a match, share the match code with students.">
            <Button onClick={onCreateMatch} disabled={busy} style={{ marginBottom: 12 }}>
              {busy ? "Creating…" : "New match"}
            </Button>
            <div style={{ display: "grid", gap: 8 }}>
              {data.summaries.length === 0 && <div style={{ color: colors.textDim, fontSize: 13 }}>No matches yet.</div>}
              {data.summaries.map((s) => (
                <div
                  key={s.matchId}
                  onClick={() => setSelectedMatch(s.matchId)}
                  style={{
                    background: selectedMatch === s.matchId ? "rgba(76,194,255,0.12)" : "#16161e",
                    border: `1px solid ${selectedMatch === s.matchId ? colors.primary : colors.border}`,
                    padding: 10,
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <strong style={{ fontFamily: "monospace", letterSpacing: 1 }}>{s.matchCode}</strong>
                    <span style={{ fontSize: 12, color: s.status === "ended" ? colors.textDim : colors.primary }}>
                      {s.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: colors.textDim, marginTop: 2 }}>
                    {s.playerCount}/{s.seatCount} players · turn {s.turn}/{s.maxTurns}
                    {s.winnerName && ` · winner ${s.winnerName}`}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div style={{ height: 16 }} />

          <Card title="AI seat" subtitle="Mint an API token so an LLM agent can play.">
            <Input label="Agent name" value={llmName} onChange={setLlmName} />
            {selectedMatch && (
              <Button onClick={() => {
                const s = data.summaries.find((x) => x.matchId === selectedMatch);
                if (s) onSeatLlm(s.matchCode);
              }}>
                Seat AI in selected match
              </Button>
            )}
            {!selectedMatch && <div style={{ fontSize: 12, color: colors.textDim }}>Select a match above first.</div>}
            {llmToken && (
              <div style={{
                marginTop: 12,
                padding: 10,
                background: "#16161e",
                border: `1px solid ${colors.border}`,
                borderRadius: 4,
                wordBreak: "break-all",
                fontSize: 12,
                fontFamily: "monospace",
              }}>
                <div style={{ color: colors.textDim, marginBottom: 4 }}>API token (one-time copy):</div>
                <div>{llmToken.apiToken}</div>
                <div style={{ color: colors.textDim, marginTop: 6 }}>match id: {llmToken.matchId}</div>
              </div>
            )}
          </Card>
        </section>

        <section>
          <Card
            title={selected ? `Match ${selected.matchCode}` : "Match details"}
            subtitle={selected ? `${selected.players.length} seats · status: ${selected.status}` : "Click a match on the left to see student decisions and outcomes."}
          >
            {!selected && <div style={{ color: colors.textDim, fontSize: 13 }}>No match selected.</div>}
            {selected && <MatchDetail audit={selected} />}
          </Card>
        </section>
      </div>
    </div>
  );
}

function MatchDetail({ audit }: { audit: MatchAudit }) {
  const turns = audit.turns;
  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: 13, opacity: 0.6, textTransform: "uppercase", margin: "0 0 6px" }}>Players</h3>
        <div style={{ display: "grid", gap: 4 }}>
          {audit.players.map((p) => (
            <div key={p.playerId} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span>
                {p.name}
                {p.role === "bot" && <span style={{ color: colors.textDim }}> (bot)</span>}
                {p.role === "ai" && <span style={{ color: "#ffb84c" }}> (AI agent)</span>}
              </span>
              <span style={{ color: colors.textDim }}>{p.companyId}</span>
            </div>
          ))}
        </div>
      </div>

      {turns.length === 0 && <div style={{ color: colors.textDim, fontSize: 13 }}>No turns resolved yet.</div>}

      {turns.map((t) => (
        <div key={t.turn} style={{ marginBottom: 12, border: `1px solid ${colors.border}`, borderRadius: 6, padding: 10 }}>
          <div style={{ fontSize: 12, color: colors.textDim, marginBottom: 6 }}>Turn {t.turn}</div>
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: colors.textDim, textAlign: "left" }}>
                <th>Player</th><th>Price</th><th>R&D total</th><th>Marketing</th><th>Cap +</th>
              </tr>
            </thead>
            <tbody>
              {audit.players.map((p) => {
                const d = t.decisions[p.playerId];
                if (!d) return null;
                const rd = d.rd.privacy + d.rd.capability + d.rd.design + d.rd.wellness;
                return (
                  <tr key={p.playerId}>
                    <td>{p.name}</td>
                    <td>${d.price}</td>
                    <td>{rd}</td>
                    <td>${d.marketing.total.toLocaleString()} ({d.marketing.segmentTarget})</td>
                    <td>+{d.capacityInvestment}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
