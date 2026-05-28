import type { ObservationView } from "@strat-sim/shared";
import { companyColorHex } from "./colors.js";

export function Briefing({
  observation,
  onClose,
}: {
  observation: ObservationView;
  onClose: () => void;
}) {
  const rivals = observation.competitors;
  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <h1 style={{ margin: "0 0 4px", fontSize: 26 }}>Your mission</h1>
        <p style={{ marginTop: 0, opacity: 0.8, lineHeight: 1.6 }}>
          You run <strong style={{ color: companyColorHex(observation.you.id) }}>{observation.you.name}</strong>,
          a startup launching an <strong>AI-wearable</strong> into a town of{" "}
          <strong>{observation.totalMarket}</strong> consumers. Each turn you set your price and
          (optional) subscription, invest R&D into four product features, spend on marketing, and
          add production capacity. Rivals do the same — simultaneously.
        </p>
        <p style={{ opacity: 0.8, lineHeight: 1.6 }}>
          Nobody buys a product that isn't good enough <em>for them</em> yet. Early on only a few
          adventurous buyers bite; as you build the product up over the {observation.maxTurns}{" "}
          turns, the mainstream comes within reach. Win by reaching a{" "}
          <strong>${fmtShort(observation.marketCapWinThreshold)} market cap</strong>, or hold the
          highest cap when the game ends.
        </p>

        <div style={sectionTitle}>The market — four customer segments</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
          {observation.segments.map((seg) => (
            <div key={seg.key} style={miniCard}>
              <strong style={{ fontSize: 13 }}>{seg.name}</strong>
              <span style={{ fontSize: 11, opacity: 0.6 }}> · {seg.size}</span>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>{seg.blurb}</div>
            </div>
          ))}
        </div>

        <div style={sectionTitle}>Your competitors</div>
        <div style={{ display: "grid", gap: 6, marginBottom: 18 }}>
          {rivals.map((c) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: companyColorHex(c.id), flexShrink: 0 }} />
              <strong>{c.name}</strong>
              <span style={{ opacity: 0.65 }}>{describeRival(c.id)}</span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 12, opacity: 0.6, marginTop: 0 }}>
          Use the tabs above the map any time to study segments, scout competitors, and check your
          capacity.
        </p>

        <button onClick={onClose} style={btnPrimary}>Got it — let's build</button>
      </div>
    </div>
  );
}

const RIVAL_BLURBS: Record<string, string> = {
  low: "— value player: aggressive low pricing, broad reach.",
  prem: "— premium brand: top-tier features, high prices.",
  niche: "— focused challenger: leans on subscriptions and a target segment.",
};

function describeRival(id: string): string {
  return RIVAL_BLURBS[id] ?? "— a rival firm vying for the same customers.";
}

function fmtShort(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(n);
}

const overlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "rgba(10,10,14,0.82)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backdropFilter: "blur(4px)",
  zIndex: 20,
  padding: 20,
  overflowY: "auto",
};

const cardStyle: React.CSSProperties = {
  background: "#1c1c24",
  border: "1px solid #2c2c38",
  borderRadius: 12,
  padding: 28,
  maxWidth: 620,
  width: "100%",
  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
  maxHeight: "100%",
  overflowY: "auto",
};

const sectionTitle: React.CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  opacity: 0.55,
  margin: "16px 0 8px",
};

const miniCard: React.CSSProperties = {
  background: "#16161e",
  border: "1px solid #2c2c38",
  borderRadius: 8,
  padding: 10,
};

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
