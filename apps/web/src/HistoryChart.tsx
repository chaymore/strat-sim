import type { ObservationView } from "@strat-sim/shared";
import { COMPANY_COLORS } from "./Town.js";

const W = 320;
const H = 90;
const PAD_L = 6;
const PAD_R = 6;
const PAD_T = 8;
const PAD_B = 14;

export function HistoryChart({
  observation,
  metric,
}: {
  observation: ObservationView;
  metric: "marketCap" | "marketShare";
}) {
  const series = [
    { id: observation.you.id, history: observation.you.history },
    // Competitors don't expose history in PublicCompanyView yet.
    // For v0.1 we just chart your own line + leave competitor lines for v0.2.
  ];

  if (series[0]?.history.length === 0) {
    return (
      <div style={{ fontSize: 12, opacity: 0.5, height: H }}>
        Your market {metric === "marketCap" ? "cap" : "share"} will appear after turn 1.
      </div>
    );
  }

  const allPoints: number[] = [];
  for (const s of series) for (const h of s.history) allPoints.push(h[metric]);
  const maxV = Math.max(1, ...allPoints);
  const turns = Math.max(1, observation.maxTurns);

  const xFor = (t: number) => PAD_L + ((t - 1) / Math.max(1, turns - 1)) * (W - PAD_L - PAD_R);
  const yFor = (v: number) => PAD_T + (1 - v / maxV) * (H - PAD_T - PAD_B);

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <rect x="0" y="0" width={W} height={H} fill="#16161e" rx="4" />
      {/* baseline */}
      <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="#2c2c38" strokeWidth="1" />

      {series.map((s) => {
        const color = COMPANY_COLORS[s.id] ?? 0xffffff;
        const stroke = `#${color.toString(16).padStart(6, "0")}`;
        const path = s.history
          .map((h, i) => `${i === 0 ? "M" : "L"} ${xFor(h.turn)} ${yFor(h[metric])}`)
          .join(" ");
        return (
          <g key={s.id}>
            <path d={path} fill="none" stroke={stroke} strokeWidth="1.6" />
            {s.history.length > 0 && (() => {
              const last = s.history[s.history.length - 1]!;
              return <circle cx={xFor(last.turn)} cy={yFor(last[metric])} r="2.5" fill={stroke} />;
            })()}
          </g>
        );
      })}
      <text x={PAD_L} y={H - 2} fontSize="10" fill="#7a7a87">turn 1</text>
      <text x={W - PAD_R} y={H - 2} fontSize="10" fill="#7a7a87" textAnchor="end">turn {turns}</text>
      <text x={PAD_L} y={PAD_T + 2} fontSize="10" fill="#7a7a87">
        {metric === "marketCap" ? `$${shortNum(maxV)}` : `${(maxV * 100).toFixed(0)}%`}
      </text>
    </svg>
  );
}

function shortNum(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(Math.round(n));
}
