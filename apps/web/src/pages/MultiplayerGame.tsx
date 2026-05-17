import { useCallback, useMemo, useState } from "react";
import { Town, type SelectedConsumer } from "../Town.js";
import { DecisionPanel } from "../DecisionPanel.js";
import { EndScreen } from "../EndScreen.js";
import { ConsumerTooltip } from "../ConsumerTooltip.js";
import { useSession } from "../session.js";
import { useMatchSocket } from "../useMatchSocket.js";
import { Page, Card } from "../ui.js";
import { navigate } from "../router.js";
import type { TurnDecision } from "@strat-sim/shared";

export function MultiplayerGame({ matchId }: { matchId: string }) {
  const session = useSession((s) => s.match);
  const setMatch = useSession((s) => s.setMatchSession);
  const token = session?.playerToken ?? null;
  const { socket, observation, awaitingCompanyIds } = useMatchSocket(matchId, token);
  const [selected, setSelected] = useState<SelectedConsumer | null>(null);

  const companyNames = useMemo(() => {
    if (!observation) return {};
    const map: Record<string, string> = { [observation.you.id]: observation.you.name };
    for (const c of observation.competitors) map[c.id] = c.name;
    return map;
  }, [observation]);

  const onSelectConsumer = useCallback((c: SelectedConsumer | null) => setSelected(c), []);

  if (!session || session.matchId !== matchId) {
    return (
      <Page>
        <Card title="No active match" subtitle="You aren't connected to this match.">
          <button onClick={() => navigate({ kind: "landing" })}>Back to landing</button>
        </Card>
      </Page>
    );
  }

  if (!observation) {
    return (
      <Page>
        <Card title="Connecting…" subtitle="Waiting for the server to send your game state." children={null} />
      </Page>
    );
  }

  const submit = (d: TurnDecision) => socket?.send({ type: "submit-decision", decision: d });
  const ended = observation.phase === "ended";
  const youSubmitted = !awaitingCompanyIds.includes(session.companyId);

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <DecisionPanel
        observation={observation}
        onSubmit={(d) => {
          setSelected(null);
          submit(d);
        }}
        onNewMatch={() => {
          setMatch(null);
          navigate({ kind: "landing" });
        }}
      />
      <main style={{ flex: 1, position: "relative" }}>
        <Town observation={observation} onSelectConsumer={onSelectConsumer} />
        {selected && (
          <ConsumerTooltip
            consumer={selected}
            onClose={() => setSelected(null)}
            companyNames={companyNames}
          />
        )}
        {!ended && awaitingCompanyIds.length > 0 && (
          <WaitingOverlay youSubmitted={youSubmitted} waiting={awaitingCompanyIds.length} />
        )}
        {ended && (
          <EndScreen
            observation={observation}
            onPlayAgain={() => {
              setMatch(null);
              navigate({ kind: "landing" });
            }}
          />
        )}
      </main>
    </div>
  );
}

function WaitingOverlay({ youSubmitted, waiting }: { youSubmitted: boolean; waiting: number }) {
  if (!youSubmitted) return null;
  return (
    <div style={{
      position: "absolute",
      top: 12,
      right: 12,
      background: "rgba(28,28,36,0.92)",
      border: "1px solid #2c2c38",
      borderRadius: 6,
      padding: "8px 12px",
      fontSize: 13,
      color: "#9aff9a",
    }}>
      Turn submitted — waiting on {waiting} player{waiting === 1 ? "" : "s"}…
    </div>
  );
}
