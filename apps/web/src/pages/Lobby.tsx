import { useEffect } from "react";
import { useSession } from "../session.js";
import { useMatchSocket } from "../useMatchSocket.js";
import { Page, Card, Button, colors } from "../ui.js";
import { navigate } from "../router.js";

export function Lobby({ matchCode }: { matchCode: string }) {
  const session = useSession((s) => s.match);
  const matchId = session?.matchId ?? null;
  const token = session?.playerToken ?? null;
  const { socket, lobby, observation } = useMatchSocket(matchId, token);

  useEffect(() => {
    // If we land here without a session for this match, kick back to landing.
    if (!session || session.matchCode !== matchCode) {
      navigate({ kind: "join" });
    }
  }, [session, matchCode]);

  useEffect(() => {
    // Once match starts, jump to play view.
    if (lobby?.status === "playing" || observation) {
      if (session) navigate({ kind: "play", matchId: session.matchId });
    }
  }, [lobby?.status, observation, session]);

  if (!session) return null;

  const isHost = lobby?.hostPlayerId === session.playerId;
  const humans = lobby?.players.filter((p) => !p.isBot) ?? [];
  const canStart = humans.length >= 2;

  return (
    <Page>
      <Card
        title={`Lobby — ${matchCode}`}
        subtitle={isHost
          ? "You are the host. Start the match when everyone has joined; empty seats become bots."
          : "Waiting for the host to start the match."}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: colors.textDim, marginBottom: 6 }}>Players</div>
          <div style={{ display: "grid", gap: 6 }}>
            {humans.length === 0 && <div style={{ opacity: 0.5, fontSize: 13 }}>connecting…</div>}
            {humans.map((p) => (
              <div
                key={p.playerId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  background: "#16161e",
                  padding: "8px 10px",
                  borderRadius: 4,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <span>
                  {p.name}
                  {p.playerId === session.playerId && <span style={{ opacity: 0.6, marginLeft: 6 }}>(you)</span>}
                  {p.playerId === lobby?.hostPlayerId && <span style={{ marginLeft: 6 }}>★</span>}
                </span>
                <span style={{
                  color: p.connected ? "#9aff9a" : colors.textDim,
                  fontSize: 12,
                }}>
                  {p.connected ? "online" : "offline"}
                </span>
              </div>
            ))}
            <div style={{ fontSize: 12, color: colors.textDim, marginTop: 4 }}>
              {humans.length}/{lobby?.seatCount ?? 4} seats filled — remaining seats will play as bots.
            </div>
          </div>
        </div>

        {isHost && (
          <Button onClick={() => socket?.send({ type: "start-match" })} disabled={!canStart}>
            {canStart ? "Start match" : "Need at least 2 players"}
          </Button>
        )}
      </Card>
    </Page>
  );
}
