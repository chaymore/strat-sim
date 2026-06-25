import type { ObservationView } from "@strat-sim/shared";
import { HistoryChart } from "../HistoryChart.js";
import { M } from "../theme.js";
import { Icon, type IconName } from "../icons.js";
import { PageHeader, Card } from "./FinanceTab.js";

export function CapacityTab({ observation }: { observation: ObservationView }) {
  const you = observation.you;
  const last = you.history.at(-1);
  const demand = last?.demand ?? 0;
  const sold = last?.unitsSold ?? 0;
  const lost = Math.max(0, demand - sold);
  const utilization = you.capacity > 0 ? Math.min(1, sold / you.capacity) : 0;

  return (
    <div style={{ fontFamily: M.font }}>
      <PageHeader title="Production Capacity" sub="Units you can build and ship each turn — $200 each, permanent" />
      <p style={{ marginTop: -8, color: M.muted, fontSize: 13.5, fontWeight: 500, lineHeight: 1.6, marginBottom: 22, maxWidth: 780 }}>
        Every new sale, switch and replacement needs a unit. If demand outruns capacity, those
        extra sales are <strong style={{ color: M.text }}>lost</strong> — the customers go elsewhere.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 18 }}>
        <Stat icon="factory" label="Capacity / turn" value={fmt(you.capacity)} />
        <Stat icon="layers" label="Shipped last turn" value={fmt(sold)} />
        <Stat icon="target" label="Demand last turn" value={fmt(demand)} danger={lost > 0} />
      </div>

      <Card title="Last turn" sub="Did you serve the market you unlocked?">
        {last ? (
          lost > 0 ? (
            <div style={{ color: M.danger, fontSize: 13.5, fontWeight: 600, lineHeight: 1.6 }}>
              You turned away <strong>{fmt(lost)}</strong> would-be buyers because you ran out of
              capacity. That's lost revenue and market share — consider investing in more capacity.
            </div>
          ) : (
            <div style={{ color: M.success, fontSize: 13.5, fontWeight: 600, lineHeight: 1.6 }}>
              You met all {fmt(demand)} units of demand. Capacity utilization was {(utilization * 100).toFixed(0)}%
              {utilization < 0.5 ? " — you may be over-built; spend may be better used elsewhere." : "."}
            </div>
          )
        ) : (
          <div style={{ fontSize: 13.5, color: M.muted, fontWeight: 600 }}>
            No turns resolved yet. Your starting capacity is {fmt(you.capacity)} units/turn.
          </div>
        )}
      </Card>

      <div style={{ marginTop: 18 }}>
        <Card title="Units shipped per turn" sub="Throughput history">
          <HistoryChart observation={observation} metric="unitsSold" height={130} />
        </Card>
      </div>

      <div style={{ marginTop: 16, fontSize: 12.5, color: M.muted, fontWeight: 500, lineHeight: 1.6, maxWidth: 820 }}>
        <strong style={{ color: M.text }}>Tip:</strong> demand grows as more of the market becomes
        ready to buy and as your product improves. A healthy installed base also creates steady
        repeat demand. Size capacity to the demand you expect to unlock — not too little (lost sales)
        and not too much (wasted cash).
      </div>
    </div>
  );
}

function Stat({ icon, label, value, danger }: { icon: IconName; label: string; value: string; danger?: boolean }) {
  return (
    <div style={{ background: "#fff", border: `1.5px solid ${M.line}`, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: danger ? M.danger : M.muted, marginBottom: 10 }}>
        <Icon name={icon} size={16} />
        <span style={{ fontSize: 10.5, letterSpacing: 1, fontWeight: 800, textTransform: "uppercase" }}>{label}</span>
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.8, color: danger ? M.danger : M.text, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString();
}
