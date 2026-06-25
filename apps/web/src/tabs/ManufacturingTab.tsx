import { FEATURE_AXES, type ObservationView } from "@strat-sim/shared";
import { axisBuildCost } from "@strat-sim/sim";
import { Meter } from "../Meter.js";

const AXIS_LABEL: Record<string, string> = {
  privacy: "Privacy",
  capability: "Capability",
  design: "Design",
  wellness: "Wellness",
};

/**
 * Manufacturing tab: the supply side. Shows each axis's capability stock, the
 * quality frontier it unlocks, the quality currently shipped, and what that
 * quality costs to build — so players can see the quality-vs-cost trade-off and
 * where capability investment (R&D) pays off.
 */
export function ManufacturingTab({ observation }: { observation: ObservationView }) {
  const you = observation.you;
  const price = you.product.price;
  const unitCost = you.unitCost;
  const margin = price - unitCost;
  const marginPct = price > 0 ? (margin / price) * 100 : 0;

  return (
    <div>
      <p style={{ marginTop: 0, opacity: 0.75, fontSize: 13, lineHeight: 1.5 }}>
        Every product has a <strong>quality</strong> on each axis (what customers value) and a{" "}
        <strong>capability</strong> behind it (what you can build, and how cheaply). R&D grows your
        capability stock, which raises the <strong>frontier</strong> — the highest quality you can
        ship on that axis — and lowers the cost of any given quality. Pushing quality toward the
        frontier is expensive; pulling it back trades quality for margin.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
        <Stat big label="Unit build cost" value={`$${fmt(unitCost)}`} />
        <Stat big label="Price" value={`$${fmt(price)}`} />
        <Stat
          big
          label="Gross margin / unit"
          value={`$${fmt(margin)} (${marginPct.toFixed(0)}%)`}
          color={margin <= 0 ? "#ff7878" : margin / Math.max(1, price) > 0.4 ? "#9aff9a" : undefined}
        />
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        {FEATURE_AXES.map((axis, i) => {
          const cap = you.capabilities[i] ?? 0;
          const frontier = you.qualityFrontier[i] ?? 0;
          const quality = you.product.features[i] ?? 0;
          const axisCost = axisBuildCost(quality, cap);
          return (
            <div key={axis} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <strong style={{ fontSize: 14 }}>{AXIS_LABEL[axis] ?? axis}</strong>
                <span style={{ fontSize: 12, opacity: 0.7 }}>
                  build cost <strong>${fmt(axisCost)}</strong>/unit · capability {cap.toFixed(0)}
                </span>
              </div>
              <Meter label="Frontier" value={frontier} color="#3a6ea5" suffix={frontier.toFixed(2)} />
              <Meter label="Shipping" value={quality} color="#4cc2ff" suffix={quality.toFixed(2)} />
              <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
                {quality >= frontier - 0.02
                  ? "Shipping at your frontier — invest R&D here to push quality higher."
                  : `You could ship up to ${frontier.toFixed(2)} on this axis with current capability.`}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 16, fontSize: 12, opacity: 0.7, lineHeight: 1.5 }}>
        <strong>Tip:</strong> capability is a stock — R&D compounds, so a few axes you invest in
        heavily become both your highest-quality and your cheapest-to-build dimensions. Spreading
        R&D across all four keeps you mediocre everywhere; focusing builds a defensible edge.
      </div>
    </div>
  );
}

function Stat({ label, value, big, color }: { label: string; value: string; big?: boolean; color?: string }) {
  return (
    <div style={{ background: "#1c1c24", border: "1px solid #2c2c38", borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: big ? 20 : 16, fontWeight: 600, color: color ?? "#f5f5f7" }}>{value}</div>
    </div>
  );
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString();
}

const cardStyle: React.CSSProperties = {
  background: "#1c1c24",
  border: "1px solid #2c2c38",
  borderRadius: 8,
  padding: 14,
};
