// Meridian — the "corporate blueprint" design system for strat-sim.
// White + deep-navy, a confident blue, amber accent, blocky Archivo type,
// crisp edges and tabular numbers. Shared tokens used across the game UI.

export const M = {
  // surfaces
  paper: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceAlt: "#F2F7FE",
  surfaceSlate: "#F7FAFE",
  // ink / navy
  navy: "#0B2545",
  navy2: "#0E2C52",
  navy3: "#143A6A",
  // brand
  blue: "#1466B8",
  blueDark: "#0F4F8F",
  amber: "#E8A33D",
  amberInk: "#7A5212",
  // text
  text: "#0B2545",
  muted: "#5A6B82",
  muted2: "#7587A0",
  onNavy: "#FFFFFF",
  onNavyMuted: "#9DB6D6",
  // lines
  line: "#D7E1EE",
  lineSoft: "#E6EEF7",
  lineHair: "#EAF0F7",
  // status
  success: "#2E8C73",
  successBg: "#E6F4EF",
  danger: "#C0392B",
  dangerBg: "#FBECEA",
  warn: "#E8A33D",
  // company seat colors (Meridian palette)
  seat: {
    you: "#1466B8",
    low: "#E8A33D",
    prem: "#B5476B",
    niche: "#2E8C73",
  } as Record<string, string>,
  font: "'Archivo', system-ui, -apple-system, 'Segoe UI', sans-serif",
  // blueprint grid background image
  gridBg:
    "linear-gradient(#0b25450a 1px, transparent 1px), linear-gradient(90deg, #0b25450a 1px, transparent 1px)",
  gridSize: "34px 34px",
} as const;

// numeric versions for Pixi
export const SEAT_NUM: Record<string, number> = {
  you: 0x1466b8,
  low: 0xe8a33d,
  prem: 0xb5476b,
  niche: 0x2e8c73,
  p1: 0x1466b8,
  p2: 0xe8a33d,
  p3: 0xb5476b,
  p4: 0x2e8c73,
};

// Lighten a hex color toward white by `amt` (0..1). Used for sprite tints so
// Kenney's cream buildings take on a readable-but-not-muddy company hue.
export function lighten(hex: number, amt: number): number {
  const r = (hex >> 16) & 0xff,
    g = (hex >> 8) & 0xff,
    b = hex & 0xff;
  const lr = Math.round(r + (255 - r) * amt);
  const lg = Math.round(g + (255 - g) * amt);
  const lb = Math.round(b + (255 - b) * amt);
  return (lr << 16) | (lg << 8) | lb;
}

// uppercase micro-label style used all over the Meridian UI
export const microLabel = {
  fontSize: 10.5,
  letterSpacing: 1.2,
  fontWeight: 800,
  textTransform: "uppercase" as const,
  color: M.muted,
};
