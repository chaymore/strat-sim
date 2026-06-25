// Lightweight inline stroke-icon set (24×24, currentColor). Keeps the UI from
// being a wall of text — every section and stat gets a glyph.
import type { CSSProperties } from "react";

const PATHS: Record<string, string> = {
  cash: "M3 7h18v10H3zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M6 7v0M18 17v0",
  cap: "M3 21h18M5 21V9l4-2 4 2v12M13 21V11l6-3v13M8 12h1M8 15h1M16 12h1M16 15h1",
  trophy: "M7 4h10v4a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M9 14v3M15 14v3M8 20h8M10 17h4",
  turn: "M12 4a8 8 0 1 0 8 8M12 4V1M12 4l3 2M12 8v4l3 2",
  tag: "M3 12l9-9 9 9-9 9zM12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4",
  beaker: "M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M7 15h10",
  mega: "M4 10v4h4l8 5V5l-8 5H4zM19 9a3 3 0 0 1 0 6",
  factory: "M3 21V11l5 3V11l5 3V8l5 3v10H3zM7 17h1M12 17h1M17 17h1",
  users: "M9 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6M3 20a6 6 0 0 1 12 0M16 6a3 3 0 0 1 0 6M21 20a6 6 0 0 0-4-5.6",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1L3.2 9.5l6.1-.9z",
  chart: "M3 3v18h18M7 15l3-4 3 2 5-7",
  map: "M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14",
  bolt: "M13 2L4 14h6l-1 8 9-12h-6z",
  arrow: "M5 12h14M13 6l6 6-6 6",
  building: "M4 21V5l8-2 8 2v16M9 9h0M9 13h0M9 17h0M15 9h0M15 13h0M15 17h0",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18",
  shield: "M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z",
  info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 11v5M12 8h0",
  close: "M6 6l12 12M18 6L6 18",
  target: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10M12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2",
  layers: "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17l9 5 9-5",
  flag: "M5 21V4M5 4h12l-2 4 2 4H5",
  coins: "M8 9a5 2.5 0 1 0 0-5 5 2.5 0 0 0 0 5M3 6.5v5c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-5M11 14.5v3c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-5c0-1.4-2.2-2.5-5-2.5",
};

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 18,
  stroke = 1.8,
  style,
}: {
  name: IconName;
  size?: number;
  stroke?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "block", flexShrink: 0, ...style }}
      aria-hidden
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
