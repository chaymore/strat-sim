import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Consumer, ObservationView, TurnDecision } from "@strat-sim/shared";
import { Town, type SelectedConsumer } from "./Town.js";
import { ConsumerTooltip } from "./ConsumerTooltip.js";
import { EndScreen } from "./EndScreen.js";
import { Briefing } from "./Briefing.js";
import { DecisionPanel } from "./DecisionPanel.js";
import { SegmentsTab } from "./tabs/SegmentsTab.js";
import { CompetitorsTab } from "./tabs/CompetitorsTab.js";
import { CapacityTab } from "./tabs/CapacityTab.js";
import { FinanceTab } from "./tabs/FinanceTab.js";
import { companyColorHex as colorHex } from "./colors.js";
import { M } from "./theme.js";
import { Icon, type IconName } from "./icons.js";

type Tab = "map" | "segments" | "competitors" | "capacity" | "finance";

const TABS: { key: Tab; label: string; icon: IconName }[] = [
  { key: "map", label: "Town map", icon: "map" },
  { key: "segments", label: "Segments", icon: "users" },
  { key: "competitors", label: "Competitors", icon: "building" },
  { key: "capacity", label: "Capacity", icon: "factory" },
  { key: "finance", label: "Finance", icon: "chart" },
];

export function GameView({
  observation,
  rawConsumers,
  onSubmit,
  onNewMatch,
  overlay,
}: {
  observation: ObservationView;
  rawConsumers?: Consumer[];
  onSubmit: (d: TurnDecision) => void;
  onNewMatch: () => void;
  overlay?: ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("map");
  const [selected, setSelected] = useState<SelectedConsumer | null>(null);
  const [briefingOpen, setBriefingOpen] = useState(observation.turn === 0);

  useEffect(() => {
    if (observation.turn === 0) setBriefingOpen(true);
  }, [observation.matchId]);

  const ended = observation.phase === "ended";

  const companyNames = useMemo(() => {
    const map: Record<string, string> = { [observation.you.id]: observation.you.name };
    for (const c of observation.competitors) map[c.id] = c.name;
    return map;
  }, [observation]);

  const changeTab = (t: Tab) => { setTab(t); setSelected(null); };
  const you = observation.you;

  return (
    <div style={shellStyle}>
      {/* ---- top KPI bar ---- */}
      <header style={topBar}>
        <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
          <span style={logo}><Icon name="bolt" size={20} stroke={2} /></span>
          <span>
            <b style={{ fontSize: 17, fontWeight: 800, letterSpacing: 0.3 }}>{you.name.toUpperCase()}</b>
            <small style={{ display: "block", color: M.onNavyMuted, fontSize: 10.5, letterSpacing: 1.2, fontWeight: 600, marginTop: 1 }}>
              AI WEARABLES DIVISION
            </small>
          </span>
        </div>
        <div style={{ display: "flex" }}>
          <Kpi icon="cash" label="Cash" value={`$${fmtShort(you.cash)}`} />
          <Kpi icon="trophy" label="Market cap" value={`$${fmtShort(you.marketCap)}`} />
          <Kpi icon="users" label="Customers" value={String(you.customers)} />
          <Kpi icon="star" label="Brand" value={you.brandReputation.toFixed(1)} />
          <Kpi icon="turn" label="Turn" value={`${pad(observation.turn)} / ${observation.maxTurns}`} />
        </div>
      </header>

      {/* ---- navy tab bar ---- */}
      <nav style={tabBar}>
        <div style={{ display: "flex", alignItems: "stretch" }}>
          {TABS.map((t) => (
            <button key={t.key} onClick={() => changeTab(t.key)} style={tab === t.key ? tabOn : tabOff}>
              <Icon name={t.icon} size={15} /> {t.label}
            </button>
          ))}
        </div>
        <button onClick={() => setBriefingOpen(true)} style={briefingBtn}>
          <Icon name="info" size={14} /> Briefing
        </button>
      </nav>

      {/* ---- body: stage + orders panel ---- */}
      <div style={bodyRow}>
        <main style={stageStyle}>
          {/* Town stays mounted so Pixi isn't torn down on tab switches. */}
          <div style={{ position: "absolute", inset: 0, visibility: tab === "map" ? "visible" : "hidden" }}>
            <Town
              observation={observation}
              rawConsumers={rawConsumers}
              onSelectConsumer={rawConsumers ? setSelected : undefined}
            />
            {tab === "map" && <Legend observation={observation} />}
            {tab === "map" && selected && (
              <ConsumerTooltip consumer={selected} onClose={() => setSelected(null)} companyNames={companyNames} />
            )}
          </div>

          {tab !== "map" && (
            <div style={panelScrollStyle}>
              <div style={{ maxWidth: 1080, margin: "0 auto" }}>
                {tab === "segments" && <SegmentsTab observation={observation} />}
                {tab === "competitors" && <CompetitorsTab observation={observation} />}
                {tab === "capacity" && <CapacityTab observation={observation} />}
                {tab === "finance" && <FinanceTab observation={observation} />}
              </div>
            </div>
          )}

          {overlay}
          {briefingOpen && !ended && (
            <Briefing observation={observation} onClose={() => setBriefingOpen(false)} />
          )}
          {ended && <EndScreen observation={observation} onPlayAgain={onNewMatch} />}
        </main>

        <DecisionPanel observation={observation} onSubmit={onSubmit} onNewMatch={onNewMatch} />
      </div>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div style={kpiCell}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, color: M.onNavyMuted }}>
        <Icon name={icon} size={12} />
        <span style={{ fontSize: 9.5, letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 }}>{label}</span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.3, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

function Legend({ observation }: { observation: ObservationView }) {
  const companies = [observation.you, ...observation.competitors];
  return (
    <div style={legendStyle}>
      <div style={legendTitle}>Market control — {observation.totalAdopted}/{observation.totalMarket}</div>
      {companies.map((c) => (
        <div key={c.id} style={legendRow}>
          <span style={{ width: 12, height: 12, background: colorHex(c.id), flexShrink: 0 }} />
          {c.name}{c.id === observation.you.id ? " (you)" : ""}
          <small style={{ marginLeft: "auto", paddingLeft: 20, color: M.muted2, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{c.customers}</small>
        </div>
      ))}
      <div style={{ ...legendRow, color: M.muted }}>
        <span style={{ width: 12, height: 12, background: "#8499b5", flexShrink: 0 }} />
        Undecided
        <small style={{ marginLeft: "auto", paddingLeft: 20, color: M.muted2, fontWeight: 700 }}>
          {observation.totalMarket - observation.totalAdopted}
        </small>
      </div>
    </div>
  );
}

function pad(n: number): string { return String(n).padStart(2, "0"); }
function fmtShort(n: number): string {
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(Math.round(n));
}

/* ----------------------------- styles ----------------------------- */
const shellStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", height: "100%", width: "100%",
  fontFamily: M.font, color: M.text, background: M.paper,
};
const topBar: React.CSSProperties = {
  height: 64, flexShrink: 0, background: M.navy, color: "#fff",
  display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px",
};
const logo: React.CSSProperties = {
  width: 36, height: 36, background: M.blue, color: "#fff",
  display: "flex", alignItems: "center", justifyContent: "center",
};
const kpiCell: React.CSSProperties = {
  padding: "0 18px", borderLeft: `1px solid ${M.navy3}`, textAlign: "right",
};
const tabBar: React.CSSProperties = {
  height: 46, flexShrink: 0, background: M.navy2,
  display: "flex", alignItems: "stretch", justifyContent: "space-between", padding: "0 12px",
};
const tabOff: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, padding: "0 18px",
  background: "transparent", color: M.onNavyMuted, border: "none",
  borderBottom: "3px solid transparent", fontSize: 13, fontWeight: 600,
  letterSpacing: 0.3, cursor: "pointer", fontFamily: M.font,
};
const tabOn: React.CSSProperties = {
  ...tabOff, color: "#fff", borderBottomColor: M.amber, fontWeight: 700,
};
const briefingBtn: React.CSSProperties = {
  alignSelf: "center", display: "flex", alignItems: "center", gap: 6,
  background: "transparent", color: M.onNavyMuted, border: `1px solid ${M.navy3}`,
  padding: "6px 11px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: M.font,
};
const bodyRow: React.CSSProperties = { flex: 1, display: "flex", minHeight: 0 };
const stageStyle: React.CSSProperties = {
  flex: 1, position: "relative", overflow: "hidden", background: M.surfaceSlate,
  borderRight: `1px solid ${M.line}`,
};
const panelScrollStyle: React.CSSProperties = {
  position: "absolute", inset: 0, overflowY: "auto", padding: "30px 40px",
  background: M.paper,
  backgroundImage: M.gridBg, backgroundSize: M.gridSize,
};
const legendStyle: React.CSSProperties = {
  position: "absolute", left: 18, bottom: 18, background: "#fff",
  border: `1.5px solid ${M.navy}`, padding: "13px 15px", zIndex: 4, minWidth: 188,
};
const legendTitle: React.CSSProperties = {
  fontSize: 9.5, letterSpacing: 1, fontWeight: 800, textTransform: "uppercase",
  color: M.muted, marginBottom: 9, borderBottom: `1px solid ${M.lineHair}`, paddingBottom: 7,
};
const legendRow: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 9, fontSize: 12.5, fontWeight: 600, margin: "6px 0",
};
