import { useState, useCallback, useMemo } from "react";
import { Town, type SelectedConsumer } from "./Town.js";
import { DecisionPanel } from "./DecisionPanel.js";
import { EndScreen } from "./EndScreen.js";
import { ConsumerTooltip } from "./ConsumerTooltip.js";
import { useGame } from "./store.js";

export function App() {
  const { observation, rawConsumers, submitHumanTurn, newMatch } = useGame();
  const [selected, setSelected] = useState<SelectedConsumer | null>(null);
  const ended = observation.phase === "ended";

  const handleSelect = useCallback((c: SelectedConsumer | null) => setSelected(c), []);

  const companyNames = useMemo(() => {
    const map: Record<string, string> = { [observation.you.id]: observation.you.name };
    for (const c of observation.competitors) map[c.id] = c.name;
    return map;
  }, [observation]);

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <DecisionPanel
        observation={observation}
        onSubmit={(d) => {
          setSelected(null);
          submitHumanTurn(d);
        }}
        onNewMatch={() => {
          setSelected(null);
          newMatch();
        }}
      />
      <main style={{ flex: 1, position: "relative" }}>
        <Town observation={observation} rawConsumers={rawConsumers} onSelectConsumer={handleSelect} />
        {selected && (
          <ConsumerTooltip
            consumer={selected}
            onClose={() => setSelected(null)}
            companyNames={companyNames}
          />
        )}
        {ended && <EndScreen observation={observation} onPlayAgain={() => newMatch()} />}
      </main>
    </div>
  );
}
