import { useState } from "react";
import type { FeatureAxis, ObservationView, TurnDecision } from "@strat-sim/shared";
import { M } from "./theme.js";
import { Icon, type IconName } from "./icons.js";

const SEGMENTS: (FeatureAxis | "broad")[] = ["broad", "privacy", "capability", "design", "wellness"];
const SEG_SHORT: Record<string, string> = {
  broad: "Broad", privacy: "Privacy", capability: "Capability", design: "Design", wellness: "Wellness",
};

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
  const turnsLeft = Math.max(0, observation.maxTurns - observation.turn);

  return (
    <aside style={panelStyle}>
      {/* navy header */}
      <header style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: 0.2, color: "#fff" }}>
            TURN {observation.turn} ORDERS
          </h2>
          <span style={turnChip}>{turnsLeft} LEFT</span>
        </div>
        <p style={{ margin: "8px 0 0", color: M.onNavyMuted, fontSize: 12, lineHeight: 1.5 }}>
          Set price, product and growth. All firms commit simultaneously.
        </p>
        <button onClick={onNewMatch} style={exitBtn}>
          {ended ? "New match" : "Resign / new match"}
        </button>
      </header>

      <div style={bodyStyle}>
        {ended ? (
          <div style={{ color: M.muted, fontSize: 13, padding: "20px 0", textAlign: "center" }}>
            This match has ended. Review the standings, then start a new match.
          </div>
        ) : (
          <>
            <SectionLabel icon="tag" text="Pricing" hint={CONCEPT_HINTS.pricing} />
            <Field icon="tag" label="Hardware price" value={price} onChange={setPrice} step={10} prefix="$"
              bar={clamp(price / 800)} note="Wider reach at lower prices; fatter margin higher up." />
            <Field icon="coins" label="Subscription" value={subPrice} onChange={setSubPrice} step={5} suffix="/mo" prefix="$"
              bar={clamp(subPrice / 40)} note="Recurring revenue — valued ~8× at exit." hint={CONCEPT_HINTS.subscription} />

            <SectionLabel icon="bolt" text="Growth" hint={CONCEPT_HINTS.rd} />
            <div style={fieldBox}>
              <div style={fieldHead}>
                <span style={fieldIcon}><Icon name="beaker" size={15} /></span>
                <span style={fieldLabel}>R&amp;D budget</span>
                <span style={fieldValue}>${fmt(rdCost)}</span>
              </div>
              <div style={{ height: 6, background: M.lineHair, margin: "9px 0 10px", position: "relative" }}>
                <div style={{ position: "absolute", inset: 0, width: `${clamp(totalRd / 60) * 100}%`, background: M.blue }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {(["privacy", "capability", "design", "wellness"] as const).map((axis) => (
                  <Stepper key={axis} label={axis} value={rd[axis]} onChange={(v) => setRd({ ...rd, [axis]: Math.max(0, v) })} />
                ))}
              </div>
            </div>

            <Field icon="mega" label="Marketing" value={marketing} onChange={setMarketing} step={5_000} prefix="$"
              bar={clamp(marketing / 200_000)} note={`Targeting the ${SEG_SHORT[segment]} segment.`} hint={CONCEPT_HINTS.marketing} />

            <div style={{ margin: "0 0 16px" }}>
              <div style={{ ...microLabelStyle, marginBottom: 8 }}>Target segment</div>
              <div style={segWrap}>
                {SEGMENTS.map((s) => (
                  <button key={s} onClick={() => setSegment(s)} style={s === segment ? segOn : segOff}>
                    {SEG_SHORT[s]}
                  </button>
                ))}
              </div>
            </div>

            <Field icon="factory" label="Add capacity" value={capacity} onChange={setCapacity} step={5} suffix=" units"
              bar={clamp(capacity / 80)} note={capacityNote(observation)} hint={CONCEPT_HINTS.capacity} />

            <div style={totalRow}>
              <span style={microLabelStyle}>Committed this turn</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: overBudget ? M.danger : M.text }}>
                ${fmt(totalSpend)}
              </span>
            </div>
            {overBudget && (
              <div style={{ fontSize: 11.5, color: M.danger, margin: "-6px 0 10px", fontWeight: 600 }}>
                Over your ${fmt(observation.you.cash)} cash — spend will be scaled down.
              </div>
            )}

            <button
              style={submitBtn}
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
              <Icon name="arrow" size={18} stroke={2.2} /> COMMIT ORDERS
            </button>
          </>
        )}

        <SectionLabel icon="info" text="Activity log" />
        <ul style={logStyle}>
          {observation.log.slice(-7).map((l, i) => <li key={i} style={{ marginBottom: 3 }}>{l}</li>)}
          {observation.log.length === 0 && <li style={{ opacity: 0.6 }}>No events yet.</li>}
        </ul>
      </div>
    </aside>
  );
}

function capacityNote(observation: ObservationView): string {
  const last = observation.you.history.at(-1);
  if (!last) return `Starting capacity ${observation.you.capacity} units/turn.`;
  const lost = Math.max(0, last.demand - last.unitsSold);
  return lost > 0
    ? `Last turn ${lost} buyers lost to capacity — consider more.`
    : `Last turn met all ${last.demand} demand.`;
}

/* ----------------------------- field widgets ----------------------------- */
function Field({
  icon, label, value, onChange, step, prefix = "", suffix = "", bar, note, hint,
}: {
  icon: IconName; label: string; value: number; onChange: (v: number) => void;
  step: number; prefix?: string; suffix?: string; bar: number; note?: string; hint?: string;
}) {
  return (
    <div style={fieldBox}>
      <div style={fieldHead}>
        <span style={fieldIcon}><Icon name={icon} size={15} /></span>
        <span style={fieldLabel}>{label}{hint && <Hint text={hint} />}</span>
        <div style={inputWrap}>
          {prefix && <span style={affix}>{prefix}</span>}
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
            style={numInput}
          />
          {suffix && <span style={affix}>{suffix}</span>}
        </div>
      </div>
      <div style={{ height: 6, background: M.lineHair, margin: "9px 0 6px", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, width: `${bar * 100}%`, background: M.blue }} />
      </div>
      {note && <div style={{ fontSize: 11, color: M.muted2, fontWeight: 500 }}>{note}</div>}
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: `1.5px solid ${M.line}`, padding: "5px 6px 5px 9px" }}>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: M.muted, textTransform: "capitalize" }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button style={stepBtn} onClick={() => onChange(Math.max(0, value - 1))}>−</button>
        <span style={{ width: 18, textAlign: "center", fontWeight: 800, fontSize: 13 }}>{value}</span>
        <button style={stepBtn} onClick={() => onChange(value + 1)}>+</button>
      </span>
    </div>
  );
}

function SectionLabel({ icon, text, hint }: { icon: IconName; text: string; hint?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0 12px" }}>
      <span style={{ color: M.blue }}><Icon name={icon} size={14} stroke={2} /></span>
      <span style={{ ...microLabelStyle }}>{text}{hint && <Hint text={hint} />}</span>
      <span style={{ flex: 1, height: 1, background: M.line }} />
    </div>
  );
}

function Hint({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex", marginLeft: 6, verticalAlign: "middle" }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <button type="button" aria-label={text} onClick={() => setShow((s) => !s)} style={hintBtn}>?</button>
      {show && <span style={tooltipStyle}>{text}</span>}
    </span>
  );
}

function clamp(n: number): number { return Math.max(0, Math.min(1, n)); }
function fmt(n: number): string { return Math.round(n).toLocaleString(); }

/* ----------------------------- styles ----------------------------- */
const microLabelStyle: React.CSSProperties = {
  fontSize: 10.5, letterSpacing: 1.2, fontWeight: 800,
  textTransform: "uppercase", color: M.muted,
};
const panelStyle: React.CSSProperties = {
  width: 408, height: "100%", background: M.surface,
  borderLeft: `1px solid ${M.line}`, display: "flex", flexDirection: "column",
  fontFamily: M.font, color: M.text,
};
const headerStyle: React.CSSProperties = {
  background: M.navy, color: "#fff", padding: "18px 22px",
};
const turnChip: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, letterSpacing: 1, color: M.navy,
  background: M.amber, padding: "4px 10px",
};
const exitBtn: React.CSSProperties = {
  marginTop: 12, background: "transparent", color: M.onNavyMuted,
  border: `1px solid ${M.navy3}`, padding: "6px 10px", fontSize: 11.5,
  fontWeight: 700, cursor: "pointer", fontFamily: M.font, letterSpacing: 0.3,
};
const bodyStyle: React.CSSProperties = {
  padding: "18px 22px 24px", overflowY: "auto", flex: 1,
};
const fieldBox: React.CSSProperties = { marginBottom: 15 };
const fieldHead: React.CSSProperties = { display: "flex", alignItems: "center", gap: 9 };
const fieldIcon: React.CSSProperties = {
  width: 26, height: 26, border: `1.5px solid ${M.navy}`, color: M.navy,
  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
};
const fieldLabel: React.CSSProperties = { fontWeight: 700, fontSize: 13.5, flex: 1, display: "inline-flex", alignItems: "center" };
const fieldValue: React.CSSProperties = { fontWeight: 800, fontSize: 15 };
const inputWrap: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 1, border: `1.5px solid ${M.line}`,
  background: M.surfaceSlate, padding: "3px 7px",
};
const affix: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: M.muted2 };
const numInput: React.CSSProperties = {
  width: 60, border: "none", background: "transparent", textAlign: "right",
  fontWeight: 800, fontSize: 14, color: M.text, fontFamily: M.font, outline: "none",
};
const stepBtn: React.CSSProperties = {
  width: 20, height: 20, border: `1.5px solid ${M.line}`, background: M.surfaceSlate,
  color: M.navy, fontWeight: 800, fontSize: 14, lineHeight: 1, cursor: "pointer", padding: 0,
};
const segWrap: React.CSSProperties = { display: "flex", border: `1.5px solid ${M.navy}` };
const segOff: React.CSSProperties = {
  flex: 1, textAlign: "center", fontSize: 10.5, fontWeight: 700, padding: "7px 2px",
  color: M.muted, background: "#fff", border: "none", borderRight: `1.5px solid ${M.navy}`,
  cursor: "pointer", fontFamily: M.font, textTransform: "uppercase", letterSpacing: 0.3,
};
const segOn: React.CSSProperties = { ...segOff, background: M.navy, color: "#fff" };
const totalRow: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  borderTop: `2px solid ${M.navy}`, marginTop: 4, paddingTop: 13, marginBottom: 12,
};
const submitBtn: React.CSSProperties = {
  width: "100%", padding: 15, background: M.blue, color: "#fff", border: "none",
  fontFamily: M.font, fontWeight: 800, fontSize: 14, letterSpacing: 0.6,
  display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
  textTransform: "uppercase", cursor: "pointer", marginBottom: 22,
};
const logStyle: React.CSSProperties = {
  paddingLeft: 16, margin: 0, fontSize: 12, color: M.muted, lineHeight: 1.5,
};
const hintBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  width: 14, height: 14, borderRadius: "50%", background: M.lineHair, color: M.muted2,
  fontSize: 10, fontWeight: 800, cursor: "help", border: "none", padding: 0,
};
const tooltipStyle: React.CSSProperties = {
  position: "absolute", top: 20, left: 0, zIndex: 30, width: 230,
  background: M.navy, border: `1px solid ${M.navy3}`, borderRadius: 4,
  padding: "9px 11px", fontSize: 12, fontWeight: 400, lineHeight: 1.5,
  textTransform: "none", letterSpacing: 0, color: "#E7EFF9",
  boxShadow: "0 8px 24px rgba(11,37,69,0.3)", whiteSpace: "normal", pointerEvents: "none",
};
