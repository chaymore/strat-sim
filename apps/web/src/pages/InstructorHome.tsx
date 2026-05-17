import { useState } from "react";
import { Page, Card, Button, Input, ErrorBanner, colors } from "../ui.js";
import { navigate } from "../router.js";
import { createClass } from "../api.js";
import { useSession } from "../session.js";

export function InstructorHome() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const instructor = useSession((s) => s.instructor);
  const setInstructorSession = useSession((s) => s.setInstructorSession);

  async function onCreate() {
    setError(null);
    setBusy(true);
    try {
      const r = await createClass(name || "Untitled class");
      setInstructorSession({
        classCode: r.classCode,
        instructorToken: r.instructorToken,
        className: r.name,
      });
      navigate({ kind: "dashboard", classCode: r.classCode });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page>
      <Card title="Create a class" subtitle="Share the class code with students so they can join your matches.">
        <ErrorBanner message={error} />
        <Input label="Class name" value={name} onChange={setName} placeholder="BUS 301 — Strategy" />
        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
          <Button onClick={onCreate} disabled={busy}>{busy ? "Creating…" : "Create class"}</Button>
          <Button onClick={() => navigate({ kind: "landing" })} variant="ghost">Back</Button>
        </div>

        {instructor && (
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: 12, color: colors.textDim, marginBottom: 6 }}>Last class</div>
            <Button
              variant="secondary"
              onClick={() => navigate({ kind: "dashboard", classCode: instructor.classCode })}
            >
              Resume {instructor.className} ({instructor.classCode})
            </Button>
          </div>
        )}
      </Card>
    </Page>
  );
}
