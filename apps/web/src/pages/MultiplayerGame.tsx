import { GameView } from "../GameView.js";
import { useSession } from "../session.js";
import { useMatchSocket } from "../useMatchSocket.js";
import { Page, Card } from "../ui.js";
import { navigate } from "../router.js";
import { M } from "../theme.js";
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
    <GameView
      observation={observation}
      onSubmit={submit}
      onNewMatch={exit}
      overlay={
        !ended && awaitingCompanyIds.length > 0 ? (
          <WaitingOverlay youSubmitted={youSubmitted} waiting={awaitingCompanyIds.length} />
        ) : null
      }
    />
  );
}

function WaitingOverlay({ youSubmitted, waiting }: { youSubmitted: boolean; waiting: number }) {
  if (!youSubmitted) return null;
  return (
    <div style={{
      position: "absolute",
      top: 18,
      right: 18,
      background: M.navy,
      border: `1px solid ${M.navy3}`,
      padding: "9px 14px",
      fontSize: 12.5,
      fontWeight: 700,
      letterSpacing: 0.3,
      color: M.amber,
      zIndex: 6,
    }}>
      ORDERS SUBMITTED — waiting on {waiting} player{waiting === 1 ? "" : "s"}…
    </div>
  );
}
