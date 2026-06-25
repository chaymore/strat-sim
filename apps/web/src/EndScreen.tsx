import type { ObservationView } from "@strat-sim/shared";
import { M } from "./theme.js";
import { companyColorHex } from "./colors.js";
import { Icon } from "./icons.js";

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
        <div style={endHeader}>
          <span style={{ color: youWon ? M.amber : "#fff" }}><Icon name="trophy" size={30} stroke={2} /></span>
          <div>
            <div style={{ fontSize: 10.5, letterSpacing: 1.4, fontWeight: 800, color: M.onNavyMuted, textTransform: "uppercase" }}>
              {hitThreshold ? `Threshold reached · turn ${observation.turn}` : `Final standings · turn ${observation.maxTurns}`}
            </div>
            <h1 style={{ margin: "2px 0 0", fontSize: 30, fontWeight: 800, color: "#fff" }}>
              {youWon ? "You won!" : `${winner?.name ?? "—"} won`}
            </h1>
          </div>
        </div>
        <div style={{ padding: "22px 28px 26px" }}>
        <p style={{ color: M.muted, margin: "0 0 18px", fontWeight: 500 }}>
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
                    background: isWinner ? M.surfaceAlt : "transparent",
                  }}
                >
                  <td style={td}>{i + 1}</td>
                  <td style={{ ...td, fontWeight: 700 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 11, height: 11, background: companyColorHex(s.id), flexShrink: 0 }} />
                      {s.name}
                      {s.isYou && <span style={{ color: M.muted2, fontWeight: 600 }}>(you)</span>}
                      {isWinner && <span style={{ color: M.amber }}>★</span>}
                    </span>
                  </td>
                  <td style={tdR}>${fmt(s.marketCap)}</td>
                  <td style={tdR}>{(s.share * 100).toFixed(1)}%</td>
                  <td style={tdR}>{s.customers}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <button onClick={onPlayAgain} style={btnPrimary}>
          <Icon name="arrow" size={18} stroke={2.2} /> PLAY AGAIN
        </button>
        </div>
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
  background: "rgba(11,37,69,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backdropFilter: "blur(4px)",
  zIndex: 10,
  fontFamily: M.font,
  padding: 20,
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: `1.5px solid ${M.navy}`,
  minWidth: 520,
  maxWidth: 560,
  boxShadow: "0 30px 80px rgba(11,37,69,0.35)",
};

const endHeader: React.CSSProperties = {
  background: M.navy,
  color: "#fff",
  padding: "22px 28px",
  display: "flex",
  alignItems: "center",
  gap: 16,
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  marginBottom: 22,
  fontSize: 14,
  border: `1.5px solid ${M.line}`,
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "11px 12px",
  background: M.navy,
  color: "#fff",
  fontWeight: 700,
  fontSize: 10.5,
  letterSpacing: 0.8,
  textTransform: "uppercase",
};

const thR: React.CSSProperties = { ...th, textAlign: "right" };
const td: React.CSSProperties = { padding: "11px 12px", borderBottom: `1px solid ${M.lineHair}`, color: M.text };
const tdR: React.CSSProperties = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 700 };

const btnPrimary: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  background: M.blue,
  color: "#fff",
  border: "none",
  fontWeight: 800,
  fontSize: 14,
  letterSpacing: 0.6,
  cursor: "pointer",
  fontFamily: M.font,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 9,
};
