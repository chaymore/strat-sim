export function Meter({
  label,
  value,
  max = 1,
  color = "#4cc2ff",
  suffix,
}: {
  label: string;
  value: number;
  max?: number;
  color?: string;
  suffix?: string;
}) {
  const pct = Math.max(0, Math.min(1, value / max)) * 100;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "92px 1fr 44px", gap: 8, alignItems: "center", marginBottom: 4 }}>
      <span style={{ fontSize: 12, opacity: 0.8 }}>{label}</span>
      <div style={{ background: "#26262f", height: 7, borderRadius: 4, overflow: "hidden" }}>
        <div style={{ background: color, height: "100%", width: `${pct}%`, transition: "width 0.3s" }} />
      </div>
      <span style={{ fontSize: 11, opacity: 0.7, textAlign: "right" }}>
        {suffix ?? `${Math.round(pct)}%`}
      </span>
    </div>
  );
}
