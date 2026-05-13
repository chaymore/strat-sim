import type { ObservationView } from "@strat-sim/shared";

export function EndScreen({
  observation,
  onPlayAgain,
}: {
  observation: ObservationView;
  onPlayAgain: () => void;
}) {
  const standings = [
    { id: observation.you.id, name: observation.you.name, marketCap: observation.you.marketCap, share: observation.you.marketShare, customers: observation.you.customers, isYou: true },
    ...observation.competitors.map((c) => ({
      id: c.id,
      name: c.name,
      marketCap: c.marketCap,
      share: c.marketShare,
      customers: c.customers,
      isYou: false,
    })),
  ].sort((a, b) => b.marketCap - a.marketCap);

  const winnerId = observation.winnerId ?? standings[0]?.id;
  const youWon = winnerId === observation.you.id;
  const winner = standings.find((s) => s.id === winnerId);
  const hitThreshold =
    winner != null && winner.marketCap >= observation.marketCapWinThreshold;

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <h1 style={{ margin: 0, fontSize: 36, color: youWon ? "#7aff9a" : "#ff8a8a" }}>
          {youWon ? "You won!" : `${winner?.name ?? "—"} won`}
        </h1>
        <p style={{ opacity: 0.7, margin: "6px 0 20px" }}>
          {hitThreshold
            ? `Crossed the $${fmt(observation.marketCapWinThreshold)} market cap threshold on turn ${observation.turn}.`
            : `Highest market cap after ${observation.maxTurns} turns.`}
        </p>

        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={th}>Rank</th>
              <th style={th}>Company</th>
              <th style={thR}>Market cap</th>
              <th style={thR}>Share</th>
              <th style={thR}>Customers</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => {
              const isWinner = s.id === winnerId;
              return (
                <tr
                  key={s.id}
                  style={{
                    background: isWinner ? "rgba(76,194,255,0.12)" : "transparent",
                    color: s.isYou ? "#4cc2ff" : "#f5f5f7",
                  }}
                >
                  <td style={td}>{i + 1}</td>
                  <td style={td}>
                    {s.name}
                    {s.isYou && <span style={{ opacity: 0.6, marginLeft: 6 }}>(you)</span>}
                    {isWinner && <span style={{ marginLeft: 6 }}>★</span>}
                  </td>
                  <td style={tdR}>${fmt(s.marketCap)}</td>
                  <td style={tdR}>{(s.share * 100).toFixed(1)}%</td>
                  <td style={tdR}>{s.customers}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <button onClick={onPlayAgain} style={btnPrimary}>Play again</button>
      </div>
    </div>
  );
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString();
}

const overlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "rgba(10,10,14,0.78)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backdropFilter: "blur(4px)",
  zIndex: 10,
};

const cardStyle: React.CSSProperties = {
  background: "#1c1c24",
  border: "1px solid #2c2c38",
  borderRadius: 12,
  padding: 32,
  minWidth: 480,
  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  marginBottom: 20,
  fontSize: 14,
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  borderBottom: "1px solid #2c2c38",
  fontWeight: 600,
  fontSize: 12,
  textTransform: "uppercase",
  opacity: 0.6,
};

const thR: React.CSSProperties = { ...th, textAlign: "right" };
const td: React.CSSProperties = { padding: "8px 10px", borderBottom: "1px solid #232330" };
const tdR: React.CSSProperties = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" };

const btnPrimary: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  background: "#4cc2ff",
  color: "#0a1018",
  border: "none",
  borderRadius: 6,
  fontWeight: 600,
  fontSize: 15,
  cursor: "pointer",
};
