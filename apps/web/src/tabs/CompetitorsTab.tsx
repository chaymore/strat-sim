import { FEATURE_AXES, type ObservationView, type PublicCompanyView } from "@strat-sim/shared";
import { Meter } from "../Meter.js";
import { HistoryChart } from "../HistoryChart.js";
import { companyColorHex } from "../colors.js";

const ARCHETYPE_LABEL: Record<string, string> = {
  lowcost: "Low-cost / value",
  premium: "Premium",
  niche: "Niche / focused",
  neutral: "Undifferentiated",
};

export function CompetitorsTab({ observation }: { observation: ObservationView }) {
  const all: (PublicCompanyView & { isYou?: boolean })[] = [
    { ...observation.you, isYou: true },
    ...observation.competitors,
  ];

  return (
    <div>
      <p style={{ marginTop: 0, opacity: 0.75, fontSize: 13 }}>
        Track what every rival is shipping: their product features, pricing, subscription play,
        brand strength, and how their market cap is trending. Use it to find an opening they're
        leaving on the table.
      </p>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, textTransform: "uppercase", opacity: 0.55, marginBottom: 4 }}>
          Market cap over time
        </div>
        <HistoryChart observation={observation} metric="marketCap" includeCompetitors height={120} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 6 }}>
          {all.map((c) => (
            <span key={c.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, opacity: 0.85 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: companyColorHex(c.id) }} />
              {c.name}{c.isYou ? " (you)" : ""}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {all.map((c) => {
          const last = c.history.at(-1);
          return (
            <div key={c.id} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <strong style={{ fontSize: 14, color: companyColorHex(c.id) }}>
                  {c.name}{c.isYou ? " (you)" : ""}
                </strong>
                <span style={{ fontSize: 12, opacity: 0.7 }}>
                  {ARCHETYPE_LABEL[c.archetype] ?? c.archetype}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 16px", margin: "8px 0", fontSize: 12 }}>
                <Stat label="Price" value={`$${fmt(c.product.price)}`} />
                <Stat label="Subscription" value={c.product.subscriptionPrice > 0 ? `$${c.product.subscriptionPrice}/mo` : "—"} />
                <Stat label="Customers" value={fmt(c.customers)} />
                <Stat label="Subscribers" value={fmt(c.subscribers)} />
                <Stat label="Market share" value={`${(c.marketShare * 100).toFixed(1)}%`} />
                <Stat label="Market cap" value={`$${fmt(c.marketCap)}`} />
                <Stat label="Brand" value={c.brandReputation.toFixed(0)} />
                <Stat label="Units last turn" value={last ? fmt(last.unitsSold) : "—"} />
              </div>

              <div style={{ fontSize: 11, textTransform: "uppercase", opacity: 0.55, margin: "4px 0" }}>
                Product features
              </div>
              {FEATURE_AXES.map((axis, i) => (
                <Meter key={axis} label={axis} value={c.product.features[i] ?? 0} color={companyColorHex(c.id)} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ opacity: 0.6 }}>{label}</span>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{value}</span>
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
