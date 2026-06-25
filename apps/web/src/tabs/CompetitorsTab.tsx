import { FEATURE_AXES, type ObservationView, type PublicCompanyView } from "@strat-sim/shared";
import { Meter } from "../Meter.js";
import { HistoryChart } from "../HistoryChart.js";
import { companyColorHex } from "../colors.js";
import { M } from "../theme.js";
import { PageHeader, Card } from "./FinanceTab.js";

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
    <div style={{ fontFamily: M.font }}>
      <PageHeader title="Competitor Intelligence" sub={`Turn ${observation.turn} scouting report · ${observation.competitors.length} rival firms`} />

      <div style={{ marginBottom: 22 }}>
        <Card title="Market cap over time" sub="Every firm's valuation trend">
          <HistoryChart observation={observation} metric="marketCap" includeCompetitors height={150} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 12 }}>
            {all.map((c) => (
              <span key={c.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: M.muted }}>
                <span style={{ width: 11, height: 11, background: companyColorHex(c.id) }} />
                {c.name}{c.isYou ? " (you)" : ""}
              </span>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {all.map((c) => {
          const last = c.history.at(-1);
          const color = companyColorHex(c.id);
          return (
            <div key={c.id} style={cardStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ width: 14, height: 14, background: color, flexShrink: 0 }} />
                <strong style={{ fontSize: 16, fontWeight: 800 }}>
                  {c.name}{c.isYou ? " (you)" : ""}
                </strong>
                <span style={{ marginLeft: "auto", fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: M.muted2 }}>
                  {ARCHETYPE_LABEL[c.archetype] ?? c.archetype}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 18px", marginBottom: 12 }}>
                <Stat label="Price" value={`$${fmt(c.product.price)}`} />
                <Stat label="Subscription" value={c.product.subscriptionPrice > 0 ? `$${c.product.subscriptionPrice}/mo` : "—"} />
                <Stat label="Customers" value={fmt(c.customers)} />
                <Stat label="Subscribers" value={fmt(c.subscribers)} />
                <Stat label="Market share" value={`${(c.marketShare * 100).toFixed(1)}%`} />
                <Stat label="Market cap" value={`$${fmt(c.marketCap)}`} />
                <Stat label="Brand" value={c.brandReputation.toFixed(0)} />
                <Stat label="Units last turn" value={last ? fmt(last.unitsSold) : "—"} />
              </div>

              <div style={microLabel}>Product features</div>
              <div style={{ marginTop: 8 }}>
                {FEATURE_AXES.map((axis, i) => (
                  <Meter key={axis} label={axis} value={c.product.features[i] ?? 0} max={Math.max(1, ...c.product.features)} color={color} suffix={String(Math.round(c.product.features[i] ?? 0))} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${M.lineHair}` }}>
      <span style={{ color: M.muted, fontWeight: 600, fontSize: 12.5 }}>{label}</span>
      <span style={{ fontWeight: 800, fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString();
}

const microLabel: React.CSSProperties = {
  fontSize: 10, letterSpacing: 1, fontWeight: 800, textTransform: "uppercase", color: M.muted,
};
const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: `1.5px solid ${M.line}`,
  padding: 18,
};
