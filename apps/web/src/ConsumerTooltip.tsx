import { FEATURE_AXES } from "@strat-sim/shared";
import { COMPANY_COLORS } from "./Town.js";
import type { SelectedConsumer } from "./Town.js";

export function ConsumerTooltip({
  consumer,
  onClose,
  companyNames,
}: {
  consumer: SelectedConsumer;
  onClose: () => void;
  companyNames: Record<string, string>;
}) {
  const adoptedColor = consumer.adopted ? COMPANY_COLORS[consumer.adopted] ?? 0xffffff : 0x808089;
  const adoptedName = consumer.adopted ? companyNames[consumer.adopted] ?? consumer.adopted : "no one yet";

  return (
    <div style={boxStyle} onClick={(e) => e.stopPropagation()}>
      <div style={headerStyle}>
        <strong style={{ fontSize: 13, fontWeight: 800, letterSpacing: 0.3 }}>CONSUMER {consumer.id}</strong>
        <button onClick={onClose} style={closeBtn}>×</button>
      </div>
      <div style={{ padding: "11px 14px" }}>
        <div style={rowStyle}>
          <span style={{ color: "#5A6B82", fontWeight: 600 }}>Owns</span>
          <span style={{ fontWeight: 800, color: `#${adoptedColor.toString(16).padStart(6, "0")}` }}>{adoptedName}</span>
        </div>
        <div style={{ fontSize: 9.5, letterSpacing: 1, fontWeight: 800, textTransform: "uppercase", color: "#5A6B82", margin: "10px 0 6px" }}>
          Preferences
        </div>
        {FEATURE_AXES.map((axis, i) => (
          <div key={axis} style={{ display: "grid", gridTemplateColumns: "72px 1fr 36px", gap: 7, alignItems: "center", marginBottom: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#5A6B82", textTransform: "capitalize" }}>{axis}</span>
            <div style={{ background: "#EAF0F7", height: 6, overflow: "hidden" }}>
              <div style={{ background: "#1466B8", height: "100%", width: `${(consumer.prefs[i] ?? 0) * 100}%` }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#0B2545", textAlign: "right" }}>
              {((consumer.prefs[i] ?? 0) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
        <div style={{ ...rowStyle, marginTop: 10, borderTop: "1px solid #EAF0F7", paddingTop: 9 }}>
          <span style={{ color: "#5A6B82", fontWeight: 600 }}>Price ceiling</span>
          <strong style={{ color: "#0B2545", fontWeight: 800 }}>${Math.round(consumer.priceCeiling)}</strong>
        </div>
      </div>
    </div>
  );
}

const boxStyle: React.CSSProperties = {
  position: "absolute",
  top: 18,
  right: 18,
  width: 240,
  background: "#fff",
  border: "1.5px solid #0B2545",
  zIndex: 5,
  fontFamily: "'Archivo', system-ui, sans-serif",
};

const headerStyle: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  background: "#0B2545", color: "#fff", padding: "10px 14px",
};

const rowStyle: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5,
};

const closeBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#9DB6D6",
  fontSize: 18,
  cursor: "pointer",
  padding: 0,
  lineHeight: 1,
};
