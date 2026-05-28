// Stable display colors for companies across solo (you/low/prem/niche) and
// multiplayer (p1..p4) seat ids, plus a hash fallback for anything else.
const KNOWN: Record<string, number> = {
  you: 0x4cc2ff,
  low: 0xffb84c,
  prem: 0xff5fa2,
  niche: 0x8aff7a,
  p1: 0x4cc2ff,
  p2: 0xffb84c,
  p3: 0xff5fa2,
  p4: 0x8aff7a,
};

const PALETTE = [0x4cc2ff, 0xffb84c, 0xff5fa2, 0x8aff7a, 0xb98aff, 0xff9e6d];

export function companyColorNum(id: string): number {
  if (KNOWN[id] != null) return KNOWN[id]!;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length]!;
}

export function companyColorHex(id: string): string {
  return `#${companyColorNum(id).toString(16).padStart(6, "0")}`;
}
