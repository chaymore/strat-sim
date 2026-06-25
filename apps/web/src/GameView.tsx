import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Consumer, ObservationView } from "@strat-sim/shared";
import { Town, type SelectedConsumer } from "./Town.js";
import { ConsumerTooltip } from "./ConsumerTooltip.js";
import { EndScreen } from "./EndScreen.js";
import { Briefing } from "./Briefing.js";
import { SegmentsTab } from "./tabs/SegmentsTab.js";
import { CompetitorsTab } from "./tabs/CompetitorsTab.js";
import { CapacityTab } from "./tabs/CapacityTab.js";
import { ManufacturingTab } from "./tabs/ManufacturingTab.js";
import { companyColorHex as colorHex } from "./colors.js";

type Tab = "map" | "segments" | "competitors" | "manufacturing" | "capacity";

const TABS: { key: Tab; label: string }[] = [
  { key: "map", label: "Town map" },
  { key: "segments", label: "Segments" },
  { key: "competitors", label: "Competitors" },
  { key: "manufacturing", label: "Manufacturing" },
  { key: "capacity", label: "Capacity" },
];

export function GameView({
  observation,
  rawConsumers,
  onPlayAgain,
  overlay,
}: {
  observation: ObservationView;
  rawConsumers?: Consumer[];
  onPlayAgain: () => void;
  overlay?: ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("map");
  const [selected, setSelected] = useState<SelectedConsumer | null>(null);
  const [briefingOpen, setBriefingOpen] = useState(observation.turn === 0);

  // Re-open the briefing automatically at the start of a fresh match.
  useEffect(() => {
    if (observation.turn === 0) setBriefingOpen(true);
  }, [observation.matchId]);

  const ended = observation.phase === "ended";

  const companyNames = useMemo(() => {
    const map: Record<string, string> = { [observation.you.id]: observation.you.name };
    for (const c of observation.competitors) map[c.id] = c.name;
    return map;
  }, [observation]);

  const changeTab = (t: Tab) => {
    setTab(t);
    setSelected(null);
  };

  return (
    <main style={{ flex: 1, position: "relative", overflow: "hidden" }}>
      <div style={tabBarStyle}>
        <div style={{ display: "flex", gap: 4 }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => changeTab(t.key)}
              style={tab === t.key ? tabActive : tabIdle}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={() => setBriefingOpen(true)} style={briefingBtn}>
          ℹ Briefing
        </button>
      </div>

      {/* Map stays mounted behind the panels so Pixi isn't torn down on tab switches. */}
      <div style={{ position: "absolute", inset: 0, paddingTop: TAB_BAR_H, visibility: tab === "map" ? "visible" : "hidden" }}>
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
          <div style={{ maxWidth: 760, margin: "0 auto" }}>
            {tab === "segments" && <SegmentsTab observation={observation} />}
            {tab === "competitors" && <CompetitorsTab observation={observation} />}
            {tab === "manufacturing" && <ManufacturingTab observation={observation} />}
            {tab === "capacity" && <CapacityTab observation={observation} />}
          </div>
        </div>
      )}

      {overlay}

      {briefingOpen && !ended && (
        <Briefing observation={observation} onClose={() => setBriefingOpen(false)} />
      )}

      {ended && <EndScreen observation={observation} onPlayAgain={onPlayAgain} />}
    </main>
  );
}

function Legend({ observation }: { observation: ObservationView }) {
  const companies = [observation.you, ...observation.competitors];
  return (
    <div style={legendStyle}>
      <div style={{ fontSize: 11, textTransform: "uppercase", opacity: 0.55, marginBottom: 4 }}>
        Who owns whom · {observation.totalAdopted}/{observation.totalMarket} adopted
      </div>
      {companies.map((c) => (
        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: colorHex(c.id) }} />
          {c.name} · {c.customers}
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, opacity: 0.7 }}>
        <span style={{ width: 9, height: 9, borderRadius: 2, background: "#808089" }} />
        not yet adopted
      </div>
    </div>
  );
}

const TAB_BAR_H = 44;

const tabBarStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: TAB_BAR_H,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 10px",
  background: "rgba(20,20,26,0.92)",
  borderBottom: "1px solid #2a2a34",
  zIndex: 6,
};

const tabIdle: React.CSSProperties = {
  padding: "6px 12px",
  background: "transparent",
  color: "#bbbbcc",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 13,
};

const tabActive: React.CSSProperties = {
  ...tabIdle,
  background: "#2c2c38",
  color: "#f5f5f7",
  fontWeight: 600,
};

const briefingBtn: React.CSSProperties = {
  padding: "6px 10px",
  background: "transparent",
  color: "#bbbbcc",
  border: "1px solid #3a3a48",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 12,
};

const panelScrollStyle: React.CSSProperties = {
  position: "absolute",
  top: TAB_BAR_H,
  left: 0,
  right: 0,
  bottom: 0,
  overflowY: "auto",
  padding: 20,
  background: "#14141a",
};

const legendStyle: React.CSSProperties = {
  position: "absolute",
  left: 12,
  bottom: 12,
  background: "rgba(28,28,36,0.9)",
  border: "1px solid #2c2c38",
  borderRadius: 8,
  padding: "8px 12px",
  display: "grid",
  gap: 3,
  zIndex: 4,
};
