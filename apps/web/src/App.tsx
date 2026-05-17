import { useRoute } from "./router.js";
import { Landing } from "./pages/Landing.js";
import { SoloGame } from "./pages/SoloGame.js";
import { JoinClass } from "./pages/JoinClass.js";
import { InstructorHome } from "./pages/InstructorHome.js";
import { Dashboard } from "./pages/Dashboard.js";
import { Lobby } from "./pages/Lobby.js";
import { MultiplayerGame } from "./pages/MultiplayerGame.js";

export function App() {
  const route = useRoute();
  switch (route.kind) {
    case "landing": return <Landing />;
    case "solo": return <SoloGame />;
    case "join": return <JoinClass />;
    case "instructor": return <InstructorHome />;
    case "dashboard": return <Dashboard classCode={route.classCode} />;
    case "lobby": return <Lobby matchCode={route.matchCode} />;
    case "play": return <MultiplayerGame matchId={route.matchId} />;
  }
}
