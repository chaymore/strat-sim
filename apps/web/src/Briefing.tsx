import type { ObservationView } from "@strat-sim/shared";
import { companyColorHex } from "./colors.js";
import { M } from "./theme.js";
import { Icon } from "./icons.js";

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
        <div style={briefHeader}>
          <span style={briefLogo}><Icon name="bolt" size={22} stroke={2} /></span>
          <div>
            <div style={{ fontSize: 10.5, letterSpacing: 1.4, fontWeight: 800, color: M.onNavyMuted, textTransform: "uppercase" }}>Mission Briefing</div>
            <h1 style={{ margin: "2px 0 0", fontSize: 24, fontWeight: 800, color: "#fff" }}>Build the category leader</h1>
          </div>
        </div>
        <div style={briefBody}>
        <p style={{ marginTop: 0, color: M.muted, lineHeight: 1.6, fontWeight: 500 }}>
          You run <strong style={{ color: companyColorHex(observation.you.id) }}>{observation.you.name}</strong>,
          a startup launching an <strong>AI-wearable</strong> into a town of{" "}
          <strong>{observation.totalMarket}</strong> consumers. Each turn you set your price and
          (optional) subscription, invest R&D into four product features, spend on marketing, and
          add production capacity. Rivals do the same — simultaneously.
        </p>
        <p style={{ color: M.muted, lineHeight: 1.6, fontWeight: 500 }}>
          Nobody buys a product that isn't good enough <em>for them</em> yet. Early on only a few
          adventurous buyers bite; as you build the product up over the {observation.maxTurns}{" "}
          turns, the mainstream comes within reach. Win by reaching a{" "}
          <strong style={{ color: M.text }}>${fmtShort(observation.marketCapWinThreshold)} market cap</strong>, or hold the
          highest cap when the game ends.
        </p>

        <div style={sectionTitle}>The market — four customer segments</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
          {observation.segments.map((seg) => (
            <div key={seg.key} style={miniCard}>
              <strong style={{ fontSize: 13.5, fontWeight: 800 }}>{seg.name}</strong>
              <span style={{ fontSize: 11, fontWeight: 700, color: M.muted2 }}> · {seg.size}</span>
              <div style={{ fontSize: 12, color: M.muted, marginTop: 3, fontWeight: 500, lineHeight: 1.5 }}>{seg.blurb}</div>
            </div>
          ))}
        </div>

        <div style={sectionTitle}>Your competitors</div>
        <div style={{ display: "grid", gap: 8, marginBottom: 18 }}>
          {rivals.map((c) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13 }}>
              <span style={{ width: 11, height: 11, background: companyColorHex(c.id), flexShrink: 0 }} />
              <strong style={{ fontWeight: 800 }}>{c.name}</strong>
              <span style={{ color: M.muted, fontWeight: 500 }}>{describeRival(c.id)}</span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 12, color: M.muted2, marginTop: 0, fontWeight: 500 }}>
          Use the tabs above the map any time to study segments, scout competitors, and check your
          finances.
        </p>

        <button onClick={onClose} style={btnPrimary}>
          <Icon name="arrow" size={18} stroke={2.2} /> GOT IT — LET'S BUILD
        </button>
        </div>
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
  background: "rgba(11,37,69,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backdropFilter: "blur(4px)",
  zIndex: 20,
  padding: 20,
  overflowY: "auto",
  fontFamily: M.font,
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: `1.5px solid ${M.navy}`,
  maxWidth: 640,
  width: "100%",
  boxShadow: "0 30px 80px rgba(11,37,69,0.35)",
  maxHeight: "100%",
  overflowY: "auto",
};

const briefHeader: React.CSSProperties = {
  background: M.navy,
  color: "#fff",
  padding: "20px 28px",
  display: "flex",
  alignItems: "center",
  gap: 14,
};

const briefLogo: React.CSSProperties = {
  width: 42, height: 42, background: M.blue, color: "#fff",
  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
};

const briefBody: React.CSSProperties = { padding: "24px 28px 28px" };

const sectionTitle: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 1.2,
  fontWeight: 800,
  color: M.muted,
  margin: "18px 0 10px",
};

const miniCard: React.CSSProperties = {
  background: M.surfaceSlate,
  border: `1.5px solid ${M.line}`,
  padding: 12,
};

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
  marginTop: 4,
};
