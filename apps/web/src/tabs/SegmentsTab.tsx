import { FEATURE_AXES, type ObservationView } from "@strat-sim/shared";
import { Meter } from "../Meter.js";

const AXIS_COLOR: Record<string, string> = {
  privacy: "#4cc2ff",
  capability: "#ffb84c",
  design: "#ff5fa2",
  wellness: "#8aff7a",
};

export function SegmentsTab({ observation }: { observation: ObservationView }) {
  return (
    <div>
      <p style={{ marginTop: 0, opacity: 0.75, fontSize: 13 }}>
        The town holds <strong>{observation.totalMarket}</strong> potential customers in four
        segments. Each segment cares about different features and has its own willingness to pay.
        Match your product to a segment's preferences — and get it good enough to clear their bar —
        to win them over. So far <strong>{observation.totalAdopted}</strong> shoppers have bought
        anything at all.
      </p>

      <div style={{ display: "grid", gap: 12 }}>
        {observation.segments.map((seg) => {
          const adoptionPct = seg.size > 0 ? (seg.adopted / seg.size) * 100 : 0;
          const color = AXIS_COLOR[seg.key] ?? "#4cc2ff";
          return (
            <div key={seg.key} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <strong style={{ fontSize: 14, color }}>{seg.name}</strong>
                <span style={{ fontSize: 12, opacity: 0.7 }}>{seg.size} people</span>
              </div>
              <p style={{ margin: "4px 0 10px", fontSize: 12, opacity: 0.7 }}>{seg.blurb}</p>

              <div style={{ fontSize: 11, textTransform: "uppercase", opacity: 0.55, marginBottom: 4 }}>
                What they value
              </div>
              {FEATURE_AXES.map((axis, i) => (
                <Meter
                  key={axis}
                  label={axis}
                  value={seg.prefs[i] ?? 0}
                  max={Math.max(...seg.prefs)}
                  color={AXIS_COLOR[axis] ?? "#4cc2ff"}
                  suffix={`${((seg.prefs[i] ?? 0) * 100).toFixed(0)}%`}
                />
              ))}

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12 }}>
                <span style={{ opacity: 0.7 }}>
                  Will pay up to <strong style={{ color: "#f5f5f7" }}>${Math.round(seg.medianPriceCeiling)}</strong>
                  <span style={{ opacity: 0.6 }}> (typical)</span>
                </span>
                <span style={{ opacity: 0.7 }}>${seg.priceRange[0]}–${seg.priceRange[1]} range</span>
              </div>

              <div style={{ marginTop: 8 }}>
                <Meter
                  label="adopted"
                  value={adoptionPct}
                  max={100}
                  color={color}
                  suffix={`${adoptionPct.toFixed(0)}%`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#1c1c24",
  border: "1px solid #2c2c38",
  borderRadius: 8,
  padding: 14,
};
