import { GameView } from "../GameView.js";
import { useGame } from "../store.js";

export function SoloGame() {
  const { observation, rawConsumers, submitHumanTurn, newMatch } = useGame();

  return (
    <GameView
      observation={observation}
      rawConsumers={rawConsumers}
      onSubmit={(d) => submitHumanTurn(d)}
      onNewMatch={() => newMatch()}
    />
  );
}
