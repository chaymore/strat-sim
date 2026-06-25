import { useEffect, useRef } from "react";
import {
  Application,
  Assets,
  Container,
  Graphics,
  Sprite,
  Texture,
  Ticker,
  type FederatedPointerEvent,
} from "pixi.js";
import { DEFAULTS, type Consumer, type ObservationView } from "@strat-sim/shared";
import { SEAT_NUM, lighten } from "./theme.js";

const TILE_W = 28;
const TILE_H = 14;

// Meridian seat colors (mirrors theme.SEAT_NUM, re-exported for tooltips/legacy).
export const COMPANY_COLORS: Record<string, number> = {
  you: SEAT_NUM.you!,
  low: SEAT_NUM.low!,
  prem: SEAT_NUM.prem!,
  niche: SEAT_NUM.niche!,
};
const NEUTRAL = 0x8499b5;

const BG = 0xf7fafe;

function isoProject(x: number, y: number): { px: number; py: number } {
  return { px: (x - y) * (TILE_W / 2), py: (x + y) * (TILE_H / 2) };
}

export interface SelectedConsumer {
  id: string;
  position: { x: number; y: number };
  prefs: readonly [number, number, number, number];
  priceCeiling: number;
  adopted: string | null;
}

interface Sprite2 {
  g: Graphics;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  startColor: number;
  targetColor: number;
  drawnColor: number;
  tStart: number;
  tEnd: number;
}

const TWEEN_MS = 700;

// ---- Kenney CC0 isometric buildings (apps/web/public/assets/buildings) ----
const HQ_TILE: Record<string, string> = {
  you: "/assets/buildings/b_040.png",
  prem: "/assets/buildings/b_113.png",
  low: "/assets/buildings/b_100.png",
  niche: "/assets/buildings/b_009.png",
};
const HQ_POSITIONS: Record<string, { x: number; y: number }> = {
  you: { x: 5, y: 5 },
  prem: { x: 34, y: 6 },
  low: { x: 6, y: 34 },
  niche: { x: 34, y: 34 },
};
// A loose downtown skyline of neutral (untinted) buildings for atmosphere.
const FILLERS: Array<{ tile: string; x: number; y: number; s: number }> = [
  { tile: "b_002", x: 17, y: 15, s: 0.46 },
  { tile: "b_021", x: 21, y: 17, s: 0.5 },
  { tile: "b_014", x: 19, y: 20, s: 0.46 },
  { tile: "b_029", x: 24, y: 21, s: 0.48 },
  { tile: "b_042", x: 16, y: 23, s: 0.44 },
  { tile: "b_004", x: 22, y: 25, s: 0.5 },
  { tile: "b_107", x: 27, y: 18, s: 0.46 },
  { tile: "b_124", x: 14, y: 18, s: 0.44 },
  { tile: "b_035", x: 26, y: 26, s: 0.46 },
  { tile: "b_028", x: 12, y: 26, s: 0.44 },
  { tile: "b_016", x: 29, y: 24, s: 0.46 },
  { tile: "b_031", x: 20, y: 12, s: 0.44 },
  { tile: "b_002", x: 30, y: 14, s: 0.42 },
  { tile: "b_021", x: 11, y: 14, s: 0.42 },
];
function tileUrl(t: string) {
  return `/assets/buildings/${t}.png`;
}
const ALL_URLS = [
  ...Object.values(HQ_TILE),
  ...FILLERS.map((f) => tileUrl(f.tile)),
];

export function Town({
  observation,
  rawConsumers,
  onSelectConsumer,
}: {
  observation: ObservationView;
  rawConsumers?: Consumer[];
  onSelectConsumer?: (c: SelectedConsumer | null) => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const spritesRef = useRef<Map<string, Sprite2>>(new Map());
  const sceneRef = useRef<Container | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let initialized = false;
    const app = new Application();
    app
      .init({ background: BG, resizeTo: host, antialias: true, resolution: Math.min(2, window.devicePixelRatio || 1), autoDensity: true })
      .then(async () => {
        initialized = true;
        if (cancelled) {
          try { app.destroy(true, { children: true }); } catch { /* */ }
          return;
        }
        host.appendChild(app.canvas);
        const world = new Container();
        world.position.set(host.clientWidth / 2, 70);
        app.stage.addChild(world);

        world.addChild(drawGround());

        // Depth-sorted scene: buildings + consumers share one sortable layer so
        // a consumer behind a tower is occluded and one in front draws over it.
        const scene = new Container();
        scene.sortableChildren = true;
        scene.eventMode = "static";
        world.addChild(scene);
        sceneRef.current = scene;
        appRef.current = app;

        // Load building textures (CC0). If the network/files are unavailable we
        // simply skip sprites — the board still works.
        let textures: Record<string, Texture> = {};
        try {
          textures = (await Assets.load(ALL_URLS)) as Record<string, Texture>;
        } catch { /* */ }
        if (cancelled) return;
        placeBuildings(scene, textures);

        syncSprites(scene, spritesRef.current, observation, rawConsumers, onSelectConsumer ?? null);

        app.ticker.add(tick);
        app.stage.eventMode = "static";
        app.stage.hitArea = app.screen;
        app.stage.on("pointertap", (e: FederatedPointerEvent) => {
          if (e.target === app.stage) onSelectConsumer?.(null);
        });
      })
      .catch(() => { /* */ });

    function tick(_t: Ticker) {
      const now = performance.now();
      for (const sprite of spritesRef.current.values()) {
        const t = Math.min(1, (now - sprite.tStart) / (sprite.tEnd - sprite.tStart));
        const e = easeOutCubic(t);
        const x = lerp(sprite.startX, sprite.targetX, e);
        const y = lerp(sprite.startY, sprite.targetY, e);
        sprite.g.position.set(x, y);
        const col = lerpColor(sprite.startColor, sprite.targetColor, e);
        if (col !== sprite.drawnColor) {
          repaintCapsule(sprite.g, col);
          sprite.drawnColor = col;
        }
      }
    }

    return () => {
      cancelled = true;
      if (initialized) {
        try { app.destroy(true, { children: true }); } catch { /* */ }
      }
      appRef.current = null;
      sceneRef.current = null;
      spritesRef.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sceneRef.current) return;
    syncSprites(sceneRef.current, spritesRef.current, observation, rawConsumers, onSelectConsumer ?? null);
  }, [observation, rawConsumers, onSelectConsumer]);

  return <div ref={hostRef} style={{ position: "absolute", inset: 0 }} />;
}

function placeBuildings(scene: Container, textures: Record<string, Texture>) {
  // HQs — tinted toward each company's color and scaled up to read as flagship
  // headquarters, with a small colored banner pole on the roof.
  for (const [id, url] of Object.entries(HQ_TILE)) {
    const tex = textures[url];
    const pos = HQ_POSITIONS[id]!;
    const { px, py } = isoProject(pos.x, pos.y);
    if (tex) {
      const sp = new Sprite(tex);
      sp.anchor.set(0.5, 0.94);
      sp.scale.set(0.82);
      sp.position.set(px, py);
      sp.tint = lighten(SEAT_NUM[id]!, 0.42);
      sp.zIndex = py;
      scene.addChild(sp);
      // banner pole + flag in the seat color, perched on the roof.
      const flag = new Graphics();
      const top = -sp.height * 0.96;
      flag.rect(-1, top, 2, sp.height * 0.2).fill(0x0b2545);
      flag.poly([1, top, 16, top + 5, 1, top + 11]).fill(SEAT_NUM[id]!);
      flag.position.set(px, py);
      flag.zIndex = py + 0.5;
      scene.addChild(flag);
    } else {
      scene.addChild(fallbackHQ(px, py, SEAT_NUM[id]!));
    }
  }
  // Neutral skyline fillers.
  for (const f of FILLERS) {
    const tex = textures[tileUrl(f.tile)];
    if (!tex) continue;
    const { px, py } = isoProject(f.x, f.y);
    const sp = new Sprite(tex);
    sp.anchor.set(0.5, 0.94);
    sp.scale.set(f.s);
    sp.position.set(px, py);
    sp.zIndex = py;
    scene.addChild(sp);
  }
}

function fallbackHQ(px: number, py: number, color: number): Graphics {
  const g = new Graphics();
  const bw = 16, bh = 30;
  g.poly([px, py - bh, px + bw, py - bh + bw / 2, px, py - bh + bw, px - bw, py - bh + bw / 2]).fill(color);
  g.poly([px, py - bh + bw, px + bw, py - bh + bw / 2, px + bw, py + bw / 2, px, py + bw]).fill(lighten(color, -0.25));
  g.poly([px, py - bh + bw, px - bw, py - bh + bw / 2, px - bw, py + bw / 2, px, py + bw]).fill(lighten(color, -0.45));
  g.zIndex = py;
  return g;
}

function syncSprites(
  scene: Container,
  sprites: Map<string, Sprite2>,
  observation: ObservationView,
  rawConsumers: Consumer[] | undefined,
  onSelect: ((c: SelectedConsumer | null) => void) | null,
) {
  const seen = new Set<string>();
  const rawMap = rawConsumers ? new Map(rawConsumers.map((c) => [c.id, c])) : null;
  const now = performance.now();

  for (const c of observation.consumers) {
    seen.add(c.id);
    const { px, py } = isoProject(c.position.x, c.position.y);
    const color = c.adopted ? (COMPANY_COLORS[c.adopted] ?? 0xffffff) : NEUTRAL;
    let s = sprites.get(c.id);
    if (!s) {
      const g = new Graphics();
      repaintCapsule(g, color);
      g.position.set(px, py);
      g.zIndex = py;
      if (onSelect && rawMap) {
        g.eventMode = "static";
        g.cursor = "pointer";
        g.hitArea = { contains: (x: number, y: number) => x >= -6 && x <= 6 && y >= -19 && y <= 2 };
        g.on("pointertap", (e: FederatedPointerEvent) => {
          e.stopPropagation();
          const raw = rawMap.get(c.id);
          if (!raw) return;
          onSelect({
            id: raw.id,
            position: raw.position,
            prefs: raw.prefs,
            priceCeiling: raw.priceCeiling,
            adopted: raw.adopted,
          });
        });
      }
      scene.addChild(g);
      s = {
        g, startX: px, startY: py, targetX: px, targetY: py,
        startColor: color, targetColor: color, drawnColor: color,
        tStart: now, tEnd: now,
      };
      sprites.set(c.id, s);
      continue;
    }
    if (s.targetX !== px || s.targetY !== py || s.targetColor !== color) {
      s.startX = s.g.position.x;
      s.startY = s.g.position.y;
      s.startColor = s.drawnColor;
      s.targetX = px;
      s.targetY = py;
      s.targetColor = color;
      s.tStart = now;
      s.tEnd = now + TWEEN_MS;
      s.g.zIndex = py;
    }
  }

  for (const [id, s] of sprites) {
    if (!seen.has(id)) {
      s.g.destroy();
      sprites.delete(id);
    }
  }
}

function repaintCapsule(g: Graphics, color: number) {
  g.clear();
  g.ellipse(0, 1, 5, 2).fill({ color: 0x0b2545, alpha: 0.14 });
  g.roundRect(-3.5, -12, 7, 12, 2.5).fill(color);
  g.circle(0, -15, 3.2).fill(color);
  g.circle(0, -15, 3.2).stroke({ color: 0xffffff, width: 0.8, alpha: 0.6 });
}

function drawGround(): Container {
  const layer = new Container();
  const g = new Graphics();
  const { width, height } = DEFAULTS.worldSize;
  // base tiles — pale slate checker
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const { px, py } = isoProject(x, y);
      const dark = (x + y) % 2 === 0;
      g.poly([
        px, py - TILE_H / 2,
        px + TILE_W / 2, py,
        px, py + TILE_H / 2,
        px - TILE_W / 2, py,
      ]).fill({ color: dark ? 0xe7eef7 : 0xeff4fb });
    }
  }
  // blueprint grid lines every few tiles
  const grid = new Graphics();
  for (let i = 0; i <= width; i += 2) {
    const a = isoProject(i, 0), b = isoProject(i, height);
    grid.moveTo(a.px, a.py).lineTo(b.px, b.py);
    const c = isoProject(0, i), d = isoProject(width, i);
    grid.moveTo(c.px, c.py).lineTo(d.px, d.py);
  }
  grid.stroke({ color: 0xb9cae0, width: 1, alpha: 0.5 });
  // outer boundary
  const o0 = isoProject(0, 0), o1 = isoProject(width, 0), o2 = isoProject(width, height), o3 = isoProject(0, height);
  const border = new Graphics();
  border.poly([o0.px, o0.py, o1.px, o1.py, o2.px, o2.py, o3.px, o3.py]).stroke({ color: 0x9db2ce, width: 2 });
  layer.addChild(g, grid, border);
  return layer;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function easeOutCubic(t: number): number {
  const u = 1 - t;
  return 1 - u * u * u;
}
function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(lerp(ar, br, t));
  const g = Math.round(lerp(ag, bg, t));
  const bl = Math.round(lerp(ab, bb, t));
  return (r << 16) | (g << 8) | bl;
}
