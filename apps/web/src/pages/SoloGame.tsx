import { DecisionPanel } from "../DecisionPanel.js";
import { GameView } from "../GameView.js";
import { useGame } from "../store.js";

export function SoloGame() {
  const { observation, rawConsumers, submitHumanTurn, newMatch } = useGame();

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <DecisionPanel
        observation={observation}
        onSubmit={(d) => submitHumanTurn(d)}
        onNewMatch={() => newMatch()}
      />
      <GameView
        observation={observation}
        rawConsumers={rawConsumers}
        onPlayAgain={() => newMatch()}
      />
    </div>
  );
}
