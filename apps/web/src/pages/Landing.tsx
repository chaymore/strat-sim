import { Page, Card, Button } from "../ui.js";
import { navigate } from "../router.js";

export function Landing() {
  return (
    <Page>
      <Card
        title="Strat Sim"
        subtitle="Run an AI-wearable company. Out-strategize your classmates (or an LLM)."
      >
        <div style={{ display: "grid", gap: 10 }}>
          <Button onClick={() => navigate({ kind: "solo" })}>Play solo vs bots</Button>
          <Button onClick={() => navigate({ kind: "join" })} variant="secondary">
            Join a class
          </Button>
          <Button onClick={() => navigate({ kind: "instructor" })} variant="ghost">
            Instructor: create a class
          </Button>
        </div>
      </Card>
    </Page>
  );
}
