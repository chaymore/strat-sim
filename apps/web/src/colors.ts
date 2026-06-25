// Stable display colors for companies across solo (you/low/prem/niche) and
// multiplayer (p1..p4) seat ids, plus a hash fallback for anything else.
const KNOWN: Record<string, number> = {
  you: 0x1466b8,
  low: 0xe8a33d,
  prem: 0xb5476b,
  niche: 0x2e8c73,
  p1: 0x1466b8,
  p2: 0xe8a33d,
  p3: 0xb5476b,
  p4: 0x2e8c73,
};

const PALETTE = [0x1466b8, 0xe8a33d, 0xb5476b, 0x2e8c73, 0x6c4f9c, 0xc05a2b];

export function companyColorNum(id: string): number {
  if (KNOWN[id] != null) return KNOWN[id]!;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length]!;
}

export function companyColorHex(id: string): string {
  return `#${companyColorNum(id).toString(16).padStart(6, "0")}`;
}
