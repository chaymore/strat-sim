import { FEATURE_AXES, type ObservationView } from "@strat-sim/shared";
import { Meter } from "../Meter.js";
import { M } from "../theme.js";
import { PageHeader } from "./FinanceTab.js";

const AXIS_COLOR: Record<string, string> = {
  privacy: "#1466B8",
  capability: "#E8A33D",
  design: "#B5476B",
  wellness: "#2E8C73",
};

export function SegmentsTab({ observation }: { observation: ObservationView }) {
  return (
    <div style={{ fontFamily: M.font }}>
      <PageHeader title="Customer Segments" sub={`${observation.totalMarket} potential customers · ${observation.totalAdopted} have adopted so far`} />
      <p style={{ marginTop: -8, color: M.muted, fontSize: 13.5, fontWeight: 500, lineHeight: 1.6, marginBottom: 22, maxWidth: 760 }}>
        The town holds four segments that each value different features and carry their own
        willingness to pay. Match your product to a segment's preferences — and get it good enough to
        clear their bar — to win them over.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {observation.segments.map((seg) => {
          const adoptionPct = seg.size > 0 ? (seg.adopted / seg.size) * 100 : 0;
          const color = AXIS_COLOR[seg.key] ?? M.blue;
          return (
            <div key={seg.key} style={cardStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <span style={{ width: 12, height: 12, background: color, flexShrink: 0 }} />
                <strong style={{ fontSize: 16, fontWeight: 800 }}>{seg.name}</strong>
                <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: M.muted2 }}>{seg.size} people</span>
              </div>
              <p style={{ margin: "0 0 14px", fontSize: 12.5, color: M.muted, fontWeight: 500, lineHeight: 1.5 }}>{seg.blurb}</p>

              <div style={microLabel}>What they value</div>
              <div style={{ marginTop: 8 }}>
                {FEATURE_AXES.map((axis, i) => (
                  <Meter
                    key={axis}
                    label={axis}
                    value={seg.prefs[i] ?? 0}
                    max={Math.max(...seg.prefs)}
                    color={AXIS_COLOR[axis] ?? M.blue}
                    suffix={`${((seg.prefs[i] ?? 0) * 100).toFixed(0)}%`}
                  />
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", margin: "12px 0 10px", fontSize: 12.5, fontWeight: 600, color: M.muted }}>
                <span>Will pay up to <strong style={{ color: M.text }}>${Math.round(seg.medianPriceCeiling)}</strong></span>
                <span>${seg.priceRange[0]}–${seg.priceRange[1]} range</span>
              </div>

              <div style={{ ...microLabel, marginBottom: 6 }}>Adopted</div>
              <Meter label="" value={adoptionPct} max={100} color={color} suffix={`${adoptionPct.toFixed(0)}%`} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

const microLabel: React.CSSProperties = {
  fontSize: 10, letterSpacing: 1, fontWeight: 800, textTransform: "uppercase", color: M.muted,
};
const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: `1.5px solid ${M.line}`,
  padding: 18,
};
