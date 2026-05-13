import { useState } from "react";
import type { FeatureAxis, ObservationView, TurnDecision } from "@strat-sim/shared";

const SEGMENTS: (FeatureAxis | "broad")[] = ["broad", "privacy", "capability", "design", "wellness"];

export function DecisionPanel({
  observation,
  onSubmit,
  onNewMatch,
}: {
  observation: ObservationView;
  onSubmit: (d: TurnDecision) => void;
  onNewMatch: () => void;
}) {
  const [price, setPrice] = useState(observation.you.product.price);
  const [subPrice, setSubPrice] = useState(observation.you.product.subscriptionPrice);
  const [rd, setRd] = useState({ privacy: 5, capability: 5, design: 5, wellness: 5 });
  const [marketing, setMarketing] = useState(50_000);
  const [segment, setSegment] = useState<FeatureAxis | "broad">("broad");
  const [capacity, setCapacity] = useState(20);

  const totalRd = rd.privacy + rd.capability + rd.design + rd.wellness;
  const rdCost = totalRd * 10_000;
  const capCost = capacity * 200;
  const totalSpend = rdCost + marketing + capCost;
  const overBudget = totalSpend > observation.you.cash;

  const ended = observation.phase === "ended";

  return (
    <aside style={panelStyle}>
      <header style={headerStyle}>
        <h2 style={{ margin: 0 }}>Turn {observation.turn} / {observation.maxTurns}</h2>
        <button onClick={onNewMatch} style={btnSecondary}>New match</button>
      </header>

      <Section title="Your company">
        <Row label="Cash" value={`$${fmt(observation.you.cash)}`} />
        <Row label="Capacity" value={String(observation.you.capacity)} />
        <Row label="Customers" value={String(observation.you.customers)} />
        <Row label="Brand" value={observation.you.brandReputation.toFixed(1)} />
        <Row label="Market cap" value={`$${fmt(observation.you.marketCap)}`} />
        <Row label="Archetype" value={observation.you.archetype} />
      </Section>

      <Section title="Competitors">
        {observation.competitors.map((c) => (
          <div key={c.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 4 }}>
            <strong>{c.name}</strong>
            <span>{(c.marketShare * 100).toFixed(1)}% · ${fmt(c.product.price)} · cap ${fmt(c.marketCap)}</span>
          </div>
        ))}
      </Section>

      {!ended && (
        <>
          <Section title="Pricing">
            <NumInput label="Price ($)" value={price} onChange={setPrice} step={10} />
            <NumInput label="Subscription ($/mo)" value={subPrice} onChange={setSubPrice} step={5} />
          </Section>

          <Section title={`R&D (${totalRd} pts × $10k = $${fmt(rdCost)})`}>
            {(["privacy", "capability", "design", "wellness"] as const).map((axis) => (
              <NumInput
                key={axis}
                label={axis}
                value={rd[axis]}
                onChange={(v) => setRd({ ...rd, [axis]: Math.max(0, v) })}
                step={1}
              />
            ))}
          </Section>

          <Section title={`Marketing ($${fmt(marketing)})`}>
            <NumInput label="Spend ($)" value={marketing} onChange={setMarketing} step={5_000} />
            <label style={{ display: "flex", justifyContent: "space-between" }}>
              Target segment
              <select value={segment} onChange={(e) => setSegment(e.target.value as FeatureAxis | "broad")}>
                {SEGMENTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </Section>

          <Section title={`Capacity (+${capacity} units, $${fmt(capCost)})`}>
            <NumInput label="Add capacity" value={capacity} onChange={setCapacity} step={5} />
          </Section>

          <div style={{ marginTop: 12, color: overBudget ? "#ff7878" : "#9aff9a" }}>
            Total spend: ${fmt(totalSpend)} {overBudget && "(over budget — will be scaled down)"}
          </div>

          <button
            style={btnPrimary}
            onClick={() =>
              onSubmit({
                companyId: observation.you.id,
                price,
                subscriptionPrice: subPrice,
                rd,
                marketing: { total: marketing, segmentTarget: segment },
                capacityInvestment: capacity,
              })
            }
          >
            Submit turn
          </button>
        </>
      )}

      {ended && (
        <Section title="Match over">
          <p>Winner: <strong>{observation.competitors.find((c) => c.id === (observation.you.id))?.name ?? observation.you.name}</strong></p>
          <button style={btnPrimary} onClick={onNewMatch}>Start a new match</button>
        </Section>
      )}

      <Section title="Log">
        <ul style={{ paddingLeft: 16, margin: 0, fontSize: 12, opacity: 0.8 }}>
          {observation.log.slice(-8).map((l, i) => <li key={i}>{l}</li>)}
        </ul>
      </Section>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 14 }}>
      <h3 style={{ fontSize: 13, textTransform: "uppercase", opacity: 0.7, margin: "0 0 6px" }}>{title}</h3>
      <div style={{ display: "grid", gap: 4 }}>{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ opacity: 0.7 }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function NumInput({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
}) {
  return (
    <label style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
      <span style={{ opacity: 0.7 }}>{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: 110, background: "#1f1f29", color: "#f5f5f7", border: "1px solid #2c2c38", borderRadius: 4, padding: "2px 6px" }}
      />
    </label>
  );
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString();
}

const panelStyle: React.CSSProperties = {
  width: 360,
  height: "100%",
  background: "#1c1c24",
  borderRight: "1px solid #2a2a34",
  padding: 16,
  overflowY: "auto",
  fontSize: 13,
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 12,
};

const btnPrimary: React.CSSProperties = {
  width: "100%",
  marginTop: 12,
  padding: "10px 12px",
  background: "#4cc2ff",
  color: "#0a1018",
  border: "none",
  borderRadius: 6,
  fontWeight: 600,
  cursor: "pointer",
};

const btnSecondary: React.CSSProperties = {
  padding: "6px 10px",
  background: "transparent",
  color: "#bbbbcc",
  border: "1px solid #3a3a48",
  borderRadius: 4,
  cursor: "pointer",
};
