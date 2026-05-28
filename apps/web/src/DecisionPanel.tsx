import { useState } from "react";
import type { FeatureAxis, ObservationView, TurnDecision } from "@strat-sim/shared";
import { HistoryChart } from "./HistoryChart.js";

const SEGMENTS: (FeatureAxis | "broad")[] = ["broad", "privacy", "capability", "design", "wellness"];

const CONCEPT_HINTS: Record<string, string> = {
  pricing:
    "Pricing theory: lower prices widen your addressable market but compress margins. Higher prices fit fewer consumers' ceilings but each sale earns more. Find the segment that values your product most.",
  rd:
    "R&D builds your product's feature vector. Diminishing returns: the first few points on an axis matter more than the next ten. Match your features to a target segment's preferences.",
  marketing:
    "Marketing raises consumer awareness so they consider you when evaluating. 'Broad' reaches all consumers thinly; a targeted segment reaches the right people more efficiently — classic segmentation & positioning.",
  capacity:
    "Production capacity caps how many new customers you can serve per turn. If demand exceeds capacity, units are allocated randomly — so under-investing in capacity throws away market share.",
  subscription:
    "Recurring revenue is valued ~8× annual at exit. A high-margin one-time sale earns you cash now; a subscription compounds — but consumers won't subscribe if it's priced too aggressively.",
  archetype:
    "Archetypes (low-cost, premium, niche) describe your current product+price strategy. Pivoting between them mid-game is allowed but costly — like real positioning shifts.",
};

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
        <Row
          label="Archetype"
          value={observation.you.archetype}
          hint={CONCEPT_HINTS.archetype}
        />
        <div style={{ marginTop: 8 }}>
          <HistoryChart observation={observation} metric="marketCap" />
        </div>
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
          <Section title="Pricing" hint={CONCEPT_HINTS.pricing}>
            <NumInput label="Price ($)" value={price} onChange={setPrice} step={10} />
            <NumInput
              label="Subscription ($/mo)"
              value={subPrice}
              onChange={setSubPrice}
              step={5}
              hint={CONCEPT_HINTS.subscription}
            />
          </Section>

          <Section title={`R&D (${totalRd} pts × $10k = $${fmt(rdCost)})`} hint={CONCEPT_HINTS.rd}>
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

          <Section title={`Marketing ($${fmt(marketing)})`} hint={CONCEPT_HINTS.marketing}>
            <NumInput label="Spend ($)" value={marketing} onChange={setMarketing} step={5_000} />
            <label style={{ display: "flex", justifyContent: "space-between" }}>
              Target segment
              <select value={segment} onChange={(e) => setSegment(e.target.value as FeatureAxis | "broad")}>
                {SEGMENTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </Section>

          <Section title={`Capacity (+${capacity} units, $${fmt(capCost)})`} hint={CONCEPT_HINTS.capacity}>
            <Row label="Current /turn" value={String(observation.you.capacity)} />
            <CapacityNote observation={observation} />
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

      <Section title="Log">
        <ul style={{ paddingLeft: 16, margin: 0, fontSize: 12, opacity: 0.8 }}>
          {observation.log.slice(-8).map((l, i) => <li key={i}>{l}</li>)}
        </ul>
      </Section>
    </aside>
  );
}

function CapacityNote({ observation }: { observation: ObservationView }) {
  const last = observation.you.history.at(-1);
  if (!last) return null;
  const lost = Math.max(0, last.demand - last.unitsSold);
  return (
    <div style={{ fontSize: 11, opacity: 0.8, color: lost > 0 ? "#ff9e6d" : "#9aff9a" }}>
      Last turn: shipped {last.unitsSold} of {last.demand} demand
      {lost > 0 ? ` — ${lost} lost to capacity` : " — all demand met"}
    </div>
  );
}

function Section({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <section style={{ marginBottom: 14 }}>
      <h3 style={{ fontSize: 13, textTransform: "uppercase", opacity: 0.7, margin: "0 0 6px", display: "flex", alignItems: "center", gap: 6 }}>
        {title}
        {hint && <Hint text={hint} />}
      </h3>
      <div style={{ display: "grid", gap: 4 }}>{children}</div>
    </section>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ opacity: 0.7, display: "inline-flex", alignItems: "center", gap: 6 }}>
        {label}
        {hint && <Hint text={hint} />}
      </span>
      <span>{value}</span>
    </div>
  );
}

function NumInput({
  label,
  value,
  onChange,
  step,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  hint?: string;
}) {
  return (
    <label style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
      <span style={{ opacity: 0.7, display: "inline-flex", alignItems: "center", gap: 6 }}>
        {label}
        {hint && <Hint text={hint} />}
      </span>
      <input
        type="number"
        value={value === 0 ? "" : value}
        placeholder="0"
        step={step}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") return onChange(0);
          const n = Number(raw);
          if (!Number.isNaN(n)) onChange(n);
        }}
        style={{ width: 110, background: "#1f1f29", color: "#f5f5f7", border: "1px solid #2c2c38", borderRadius: 4, padding: "2px 6px" }}
      />
    </label>
  );
}

function Hint({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <button
        type="button"
        aria-label={text}
        onClick={() => setShow((s) => !s)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: "#2c2c38",
          color: "#bbbbcc",
          fontSize: 10,
          fontWeight: 600,
          cursor: "help",
          border: "none",
          padding: 0,
        }}
      >
        ?
      </button>
      {show && <span style={tooltipStyle}>{text}</span>}
    </span>
  );
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString();
}

const tooltipStyle: React.CSSProperties = {
  position: "absolute",
  top: 20,
  left: 0,
  zIndex: 30,
  width: 230,
  background: "#0f0f16",
  border: "1px solid #3a3a48",
  borderRadius: 6,
  padding: "8px 10px",
  fontSize: 12,
  fontWeight: 400,
  lineHeight: 1.45,
  textTransform: "none",
  letterSpacing: 0,
  color: "#dcdce4",
  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
  whiteSpace: "normal",
  pointerEvents: "none",
};

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
