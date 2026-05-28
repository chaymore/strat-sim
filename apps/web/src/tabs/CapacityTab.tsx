import type { ObservationView } from "@strat-sim/shared";
import { HistoryChart } from "../HistoryChart.js";

export function CapacityTab({ observation }: { observation: ObservationView }) {
  const you = observation.you;
  const last = you.history.at(-1);
  const demand = last?.demand ?? 0;
  const sold = last?.unitsSold ?? 0;
  const lost = Math.max(0, demand - sold);
  const utilization = you.capacity > 0 ? Math.min(1, sold / you.capacity) : 0;

  return (
    <div>
      <p style={{ marginTop: 0, opacity: 0.75, fontSize: 13 }}>
        Capacity is how many units you can <strong>build and ship per turn</strong>. Every new
        sale, switch, and replacement needs a unit. If demand for your product is higher than your
        capacity, those extra sales are simply <strong>lost</strong> — the customers go elsewhere
        or wait. Each unit of capacity costs $200 to add and is permanent.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        <Stat big label="Capacity / turn" value={fmt(you.capacity)} />
        <Stat big label="Shipped last turn" value={fmt(sold)} />
        <Stat big label="Demand last turn" value={fmt(demand)} color={lost > 0 ? "#ff9e6d" : undefined} />
      </div>

      {last ? (
        <div style={cardStyle}>
          {lost > 0 ? (
            <div style={{ color: "#ff9e6d", fontSize: 13 }}>
              You turned away <strong>{fmt(lost)}</strong> would-be buyers last turn because you
              ran out of capacity. That's lost revenue and market share — consider investing in
              more capacity.
            </div>
          ) : (
            <div style={{ color: "#9aff9a", fontSize: 13 }}>
              You met all {fmt(demand)} units of demand last turn. Capacity utilization was{" "}
              {(utilization * 100).toFixed(0)}%
              {utilization < 0.5 ? " — you may be over-built; spend may be better used elsewhere." : "."}
            </div>
          )}
        </div>
      ) : (
        <div style={cardStyle}>
          <div style={{ fontSize: 13, opacity: 0.7 }}>
            No turns resolved yet. Your starting capacity is {fmt(you.capacity)} units/turn.
          </div>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 11, textTransform: "uppercase", opacity: 0.55, marginBottom: 4 }}>
          Units shipped per turn
        </div>
        <HistoryChart observation={observation} metric="unitsSold" height={110} />
      </div>

      <div style={{ marginTop: 16, fontSize: 12, opacity: 0.7, lineHeight: 1.5 }}>
        <strong>Tip:</strong> demand grows over the game as more of the market becomes ready to buy
        and as your product improves. Customers also replace worn-out products every few turns, so
        a healthy installed base creates steady repeat demand. Size your capacity to the demand you
        expect to unlock — not too little (lost sales) and not too much (wasted cash).
      </div>
    </div>
  );
}

function Stat({ label, value, big, color }: { label: string; value: string; big?: boolean; color?: string }) {
  return (
    <div style={{ background: "#1c1c24", border: "1px solid #2c2c38", borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: big ? 22 : 16, fontWeight: 600, color: color ?? "#f5f5f7" }}>{value}</div>
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
