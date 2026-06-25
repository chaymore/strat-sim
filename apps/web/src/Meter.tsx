export function Meter({
  label,
  value,
  max = 1,
  color = "#1466B8",
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
    <div style={{ display: "grid", gridTemplateColumns: "96px 1fr 44px", gap: 9, alignItems: "center", marginBottom: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#5A6B82", textTransform: "capitalize" }}>{label}</span>
      <div style={{ background: "#EAF0F7", height: 8, overflow: "hidden" }}>
        <div style={{ background: color, height: "100%", width: `${pct}%`, transition: "width 0.3s" }} />
      </div>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: "#0B2545", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
        {suffix ?? `${Math.round(pct)}%`}
      </span>
    </div>
  );
}
