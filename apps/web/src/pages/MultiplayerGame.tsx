import { DecisionPanel } from "../DecisionPanel.js";
import { GameView } from "../GameView.js";
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
  const exit = () => {
    setMatch(null);
    navigate({ kind: "landing" });
  };

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <DecisionPanel observation={observation} onSubmit={submit} onNewMatch={exit} />
      <GameView
        observation={observation}
        onPlayAgain={exit}
        overlay={
          !ended && awaitingCompanyIds.length > 0 ? (
            <WaitingOverlay youSubmitted={youSubmitted} waiting={awaitingCompanyIds.length} />
          ) : null
        }
      />
    </div>
  );
}

function WaitingOverlay({ youSubmitted, waiting }: { youSubmitted: boolean; waiting: number }) {
  if (!youSubmitted) return null;
  return (
    <div style={{
      position: "absolute",
      top: 56,
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
