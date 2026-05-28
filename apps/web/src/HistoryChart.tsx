import type { ObservationView, TurnSnapshot } from "@strat-sim/shared";
import { companyColorHex } from "./colors.js";

const W = 320;
const H = 90;
const PAD_L = 6;
const PAD_R = 6;
const PAD_T = 8;
const PAD_B = 14;

type Metric = "marketCap" | "marketShare" | "customers" | "unitsSold";

interface Series {
  id: string;
  history: TurnSnapshot[];
}

export function HistoryChart({
  observation,
  metric,
  includeCompetitors = false,
  height = H,
}: {
  observation: ObservationView;
  metric: Metric;
  includeCompetitors?: boolean;
  height?: number;
}) {
  const series: Series[] = [{ id: observation.you.id, history: observation.you.history }];
  if (includeCompetitors) {
    for (const c of observation.competitors) series.push({ id: c.id, history: c.history });
  }

  const hasData = series.some((s) => s.history.length > 0);
  if (!hasData) {
    return (
      <div style={{ fontSize: 12, opacity: 0.5, height }}>
        Data will appear after turn 1.
      </div>
    );
  }

  const allPoints: number[] = [];
  for (const s of series) for (const h of s.history) allPoints.push(h[metric]);
  const maxV = Math.max(1, ...allPoints);
  const turns = Math.max(1, observation.maxTurns);

  const xFor = (t: number) => PAD_L + ((t - 1) / Math.max(1, turns - 1)) * (W - PAD_L - PAD_R);
  const yFor = (v: number) => PAD_T + (1 - v / maxV) * (height - PAD_T - PAD_B);

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <rect x="0" y="0" width={W} height={height} fill="#16161e" rx="4" />
      <line x1={PAD_L} y1={height - PAD_B} x2={W - PAD_R} y2={height - PAD_B} stroke="#2c2c38" strokeWidth="1" />

      {series.map((s) => {
        if (s.history.length === 0) return null;
        const stroke = companyColorHex(s.id);
        const path = s.history
          .map((h, i) => `${i === 0 ? "M" : "L"} ${xFor(h.turn)} ${yFor(h[metric])}`)
          .join(" ");
        const last = s.history[s.history.length - 1]!;
        return (
          <g key={s.id}>
            <path d={path} fill="none" stroke={stroke} strokeWidth="1.6" />
            <circle cx={xFor(last.turn)} cy={yFor(last[metric])} r="2.5" fill={stroke} />
          </g>
        );
      })}
      <text x={PAD_L} y={height - 2} fontSize="10" fill="#7a7a87">turn 1</text>
      <text x={W - PAD_R} y={height - 2} fontSize="10" fill="#7a7a87" textAnchor="end">turn {turns}</text>
      <text x={PAD_L} y={PAD_T + 2} fontSize="10" fill="#7a7a87">
        {labelMax(metric, maxV)}
      </text>
    </svg>
  );
}

function labelMax(metric: Metric, maxV: number): string {
  if (metric === "marketShare") return `${(maxV * 100).toFixed(0)}%`;
  if (metric === "marketCap") return `$${shortNum(maxV)}`;
  return shortNum(maxV);
}

function shortNum(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(Math.round(n));
}
