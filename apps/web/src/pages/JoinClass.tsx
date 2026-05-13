import { useState } from "react";
import { Page, Card, Button, Input, ErrorBanner } from "../ui.js";
import { navigate } from "../router.js";
import { joinMatch } from "../api.js";
import { useSession } from "../session.js";

export function JoinClass() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const setMatchSession = useSession((s) => s.setMatchSession);

  async function onJoin() {
    setError(null);
    if (!code || !name) {
      setError("match code and name are both required");
      return;
    }
    setBusy(true);
    try {
      const r = await joinMatch(code, name);
      setMatchSession({
        matchId: r.matchId,
        matchCode: code.toUpperCase(),
        playerId: r.playerId,
        playerToken: r.playerToken,
        companyId: r.companyId,
        name,
      });
      navigate({ kind: "lobby", matchCode: code.toUpperCase() });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page>
      <Card title="Join a match" subtitle="Enter the 5-character match code from your instructor.">
        <ErrorBanner message={error} />
        <Input label="Match code" value={code} onChange={setCode} autoUpper placeholder="ABCDE" />
        <Input label="Your name" value={name} onChange={setName} placeholder="Anya" />
        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
          <Button onClick={onJoin} disabled={busy}>{busy ? "Joining…" : "Join"}</Button>
          <Button onClick={() => navigate({ kind: "landing" })} variant="ghost">Back</Button>
        </div>
      </Card>
    </Page>
  );
}
