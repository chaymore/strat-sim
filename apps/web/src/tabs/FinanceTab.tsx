import type { ObservationView } from "@strat-sim/shared";
import { HistoryChart } from "../HistoryChart.js";
import { M } from "../theme.js";
import { Icon, type IconName } from "../icons.js";

export function FinanceTab({ observation }: { observation: ObservationView }) {
  const you = observation.you;
  const last = you.history.at(-1);
  const prev = you.history.at(-2);
  const revenue = last?.revenue ?? 0;
  const ebitda = last?.ebitda ?? 0;
  const goalPct = Math.min(100, (you.marketCap / observation.marketCapWinThreshold) * 100);

  return (
    <div style={{ fontFamily: M.font }}>
      <PageHeader title="Finance" sub="Where your money came from and where it's going this game." />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        <Kpi icon="cash" label="Cash on hand" value={`$${fmtShort(you.cash)}`} />
        <Kpi icon="trophy" label="Market cap" value={`$${fmtShort(you.marketCap)}`}
          delta={delta(last?.marketCap, prev?.marketCap)} up />
        <Kpi icon="chart" label="Revenue / turn" value={`$${fmtShort(revenue)}`}
          delta={delta(revenue, prev?.revenue)} up={revenue >= (prev?.revenue ?? 0)} />
        <Kpi icon="coins" label="EBITDA / turn" value={`$${fmtShort(ebitda)}`}
          delta={delta(ebitda, prev?.ebitda)} up={ebitda >= (prev?.ebitda ?? 0)} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 18 }}>
        <Card title="Market cap trajectory" sub={`Goal: reach $${fmtShort(observation.marketCapWinThreshold)} before turn ${observation.maxTurns}`}>
          <HistoryChart observation={observation} metric="marketCap" height={210} />
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", ...microLabel, marginBottom: 6 }}>
              <span>Progress to win</span><span>{goalPct.toFixed(0)}%</span>
            </div>
            <div style={{ height: 10, background: M.lineHair, position: "relative" }}>
              <div style={{ position: "absolute", inset: 0, width: `${goalPct}%`, background: M.blue }} />
            </div>
          </div>
        </Card>

        <Card title="Operating snapshot" sub="Latest resolved turn">
          <Line label="Customers (installed base)" value={fmt(you.customers)} icon="users" />
          <Line label="Subscribers" value={fmt(you.subscribers)} icon="coins" />
          <Line label="Units shipped" value={last ? fmt(last.unitsSold) : "—"} icon="factory" />
          <Line label="Demand" value={last ? fmt(last.demand) : "—"} icon="target" />
          <Line label="Brand reputation" value={you.brandReputation.toFixed(1)} icon="star" />
          <Line label="Capacity / turn" value={fmt(you.capacity)} icon="cap" last />
        </Card>
      </div>

      <div style={{ marginTop: 18 }}>
        <Card title="Revenue per turn" sub="Top-line sales each turn — hardware plus recurring">
          <HistoryChart observation={observation} metric="customers" height={120} />
        </Card>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, delta, up }: { icon: IconName; label: string; value: string; delta?: string; up?: boolean }) {
  return (
    <div style={{ border: `1.5px solid ${M.line}`, background: "#fff", padding: 18 }}>
      <div style={{ width: 40, height: 40, border: `1.5px solid ${M.navy}`, color: M.navy, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
        <Icon name={icon} size={20} />
      </div>
      <div style={microLabel}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.6, margin: "3px 0 4px", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {delta && <div style={{ fontSize: 12, fontWeight: 700, color: up ? M.success : M.danger }}>{up ? "▲" : "▼"} {delta}</div>}
    </div>
  );
}

function Line({ label, value, icon, last }: { label: string; value: string; icon: IconName; last?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0", borderBottom: last ? "none" : `1px solid ${M.lineHair}` }}>
      <span style={{ color: M.blue }}><Icon name={icon} size={16} /></span>
      <span style={{ fontSize: 13, fontWeight: 600, color: M.muted, flex: 1 }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

export function PageHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ borderBottom: `2px solid ${M.navy}`, paddingBottom: 14, marginBottom: 24, display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>{title}</h1>
      <span style={{ color: M.muted2, fontSize: 13.5, fontWeight: 600 }}>{sub}</span>
    </div>
  );
}

export function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ border: `1.5px solid ${M.line}`, background: "#fff", padding: 22 }}>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{title}</h3>
      {sub && <div style={{ color: M.muted2, fontSize: 12.5, fontWeight: 600, margin: "3px 0 16px" }}>{sub}</div>}
      {children}
    </div>
  );
}

const microLabel: React.CSSProperties = {
  fontSize: 10.5, letterSpacing: 1, fontWeight: 800, textTransform: "uppercase", color: M.muted,
};

function delta(a?: number, b?: number): string | undefined {
  if (a == null || b == null) return undefined;
  const d = a - b;
  return `$${fmtShort(Math.abs(d))}`;
}
function fmt(n: number): string { return Math.round(n).toLocaleString(); }
function fmtShort(n: number): string {
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(Math.round(n));
}
