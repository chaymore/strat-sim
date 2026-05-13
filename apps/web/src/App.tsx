import { Town } from "./Town.js";
import { DecisionPanel } from "./DecisionPanel.js";
import { useGame } from "./store.js";

export function App() {
  const { observation, submitHumanTurn, newMatch } = useGame();
  return (
    <div style={{ display: "flex", height: "100%" }}>
      <DecisionPanel
        observation={observation}
        onSubmit={submitHumanTurn}
        onNewMatch={() => newMatch()}
      />
      <main style={{ flex: 1, position: "relative" }}>
        <Town observation={observation} />
      </main>
    </div>
  );
}
