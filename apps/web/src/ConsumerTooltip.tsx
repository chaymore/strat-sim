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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <strong style={{ fontSize: 13 }}>Consumer {consumer.id}</strong>
        <button onClick={onClose} style={closeBtn}>×</button>
      </div>
      <div style={{ opacity: 0.7, fontSize: 12, marginBottom: 8 }}>
        Owns:{" "}
        <span style={{ color: `#${adoptedColor.toString(16).padStart(6, "0")}` }}>
          {adoptedName}
        </span>
      </div>
      <div style={{ fontSize: 12, marginBottom: 4, opacity: 0.7 }}>Preferences</div>
      {FEATURE_AXES.map((axis, i) => (
        <div key={axis} style={{ display: "grid", gridTemplateColumns: "70px 1fr 36px", gap: 6, alignItems: "center", marginBottom: 3 }}>
          <span style={{ fontSize: 12, opacity: 0.8 }}>{axis}</span>
          <div style={{ background: "#26262f", height: 6, borderRadius: 3, overflow: "hidden" }}>
            <div style={{
              background: "#4cc2ff",
              height: "100%",
              width: `${(consumer.prefs[i] ?? 0) * 100}%`,
            }} />
          </div>
          <span style={{ fontSize: 11, opacity: 0.7, textAlign: "right" }}>
            {((consumer.prefs[i] ?? 0) * 100).toFixed(0)}%
          </span>
        </div>
      ))}
      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
        Price ceiling: <strong style={{ color: "#f5f5f7" }}>${Math.round(consumer.priceCeiling)}</strong>
      </div>
    </div>
  );
}

const boxStyle: React.CSSProperties = {
  position: "absolute",
  top: 16,
  right: 16,
  width: 240,
  background: "#1c1c24",
  border: "1px solid #2c2c38",
  borderRadius: 8,
  padding: 12,
  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
  color: "#f5f5f7",
  zIndex: 5,
};

const closeBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#bbbbcc",
  fontSize: 18,
  cursor: "pointer",
  padding: 0,
  lineHeight: 1,
};
