import { useEffect, useRef } from "react";
import {
  Application,
  Container,
  Graphics,
  Ticker,
  type FederatedPointerEvent,
} from "pixi.js";
import { DEFAULTS, HQ_CORNERS, type Consumer, type ObservationView } from "@strat-sim/shared";

const TILE_W = 28;
const TILE_H = 14;
export const COMPANY_COLORS: Record<string, number> = {
  you: 0x4cc2ff,
  low: 0xffb84c,
  prem: 0xff5fa2,
  niche: 0x8aff7a,
};
const NEUTRAL = 0x808089;

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

interface Sprite {
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
  const spritesRef = useRef<Map<string, Sprite>>(new Map());
  const consumerLayerRef = useRef<Container | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let initialized = false;
    const app = new Application();
    app
      .init({ background: 0x14141a, resizeTo: host, antialias: true })
      .then(() => {
        initialized = true;
        if (cancelled) {
          try { app.destroy(true, { children: true }); } catch { /* */ }
          return;
        }
        host.appendChild(app.canvas);
        const world = new Container();
        world.position.set(host.clientWidth / 2, 80);
        app.stage.addChild(world);

        world.addChild(drawGround());
        world.addChild(drawHQs());

        const consumerLayer = new Container();
        consumerLayer.eventMode = "static";
        world.addChild(consumerLayer);
        consumerLayerRef.current = consumerLayer;
        appRef.current = app;

        syncSprites(consumerLayer, spritesRef.current, observation, rawConsumers, onSelectConsumer ?? null);

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
      consumerLayerRef.current = null;
      spritesRef.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!consumerLayerRef.current) return;
    syncSprites(consumerLayerRef.current, spritesRef.current, observation, rawConsumers, onSelectConsumer ?? null);
  }, [observation, rawConsumers, onSelectConsumer]);

  return <div ref={hostRef} style={{ position: "absolute", inset: 0 }} />;
}

function syncSprites(
  layer: Container,
  sprites: Map<string, Sprite>,
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
      layer.addChild(g);
      s = {
        g,
        startX: px,
        startY: py,
        targetX: px,
        targetY: py,
        startColor: color,
        targetColor: color,
        drawnColor: color,
        tStart: now,
        tEnd: now,
      };
      sprites.set(c.id, s);
      continue;
    }
    // Update tween only if target moved or color changed
    if (s.targetX !== px || s.targetY !== py || s.targetColor !== color) {
      s.startX = s.g.position.x;
      s.startY = s.g.position.y;
      s.startColor = s.drawnColor;
      s.targetX = px;
      s.targetY = py;
      s.targetColor = color;
      s.tStart = now;
      s.tEnd = now + TWEEN_MS;
    }
  }

  // Remove sprites for consumers no longer present (shouldn't happen, but safe)
  for (const [id, s] of sprites) {
    if (!seen.has(id)) {
      s.g.destroy();
      sprites.delete(id);
    }
  }

  // Repaint order each turn so southerly sprites draw on top.
  layer.children.sort((a, b) => a.y - b.y);
}

function repaintCapsule(g: Graphics, color: number) {
  g.clear();
  g.ellipse(0, 0, 5, 2).fill({ color: 0x000000, alpha: 0.35 });
  g.roundRect(-3.5, -12, 7, 12, 2.5).fill(color);
  g.circle(0, -15, 3.2).fill(color);
}

function drawGround(): Container {
  const layer = new Container();
  const g = new Graphics();
  const { width, height } = DEFAULTS.worldSize;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const { px, py } = isoProject(x, y);
      const dark = (x + y) % 2 === 0;
      g.poly([
        px, py - TILE_H / 2,
        px + TILE_W / 2, py,
        px, py + TILE_H / 2,
        px - TILE_W / 2, py,
      ]).fill({ color: dark ? 0x1d1d28 : 0x21212d });
    }
  }
  layer.addChild(g);
  return layer;
}

const HQ_POSITIONS = HQ_CORNERS;
const HQ_IDS = ["you", "low", "prem", "niche"];

function drawHQs(): Container {
  const layer = new Container();
  HQ_IDS.forEach((id, i) => {
    const pos = HQ_POSITIONS[i]!;
    const color = COMPANY_COLORS[id] ?? 0xffffff;
    const { px, py } = isoProject(pos.x, pos.y);
    const g = new Graphics();
    const left = darken(color, 0.55);
    const right = darken(color, 0.75);
    const bw = 18;
    const bh = 26;
    g.poly([px, py - bh, px + bw, py - bh + bw / 2, px, py - bh + bw, px - bw, py - bh + bw / 2]).fill(color);
    g.poly([px, py - bh + bw, px + bw, py - bh + bw / 2, px + bw, py + bw / 2, px, py + bw]).fill(right);
    g.poly([px, py - bh + bw, px - bw, py - bh + bw / 2, px - bw, py + bw / 2, px, py + bw]).fill(left);
    layer.addChild(g);
  });
  return layer;
}

function darken(color: number, k: number): number {
  const r = ((color >> 16) & 0xff) * k;
  const gC = ((color >> 8) & 0xff) * k;
  const b = (color & 0xff) * k;
  return (Math.floor(r) << 16) | (Math.floor(gC) << 8) | Math.floor(b);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeOutCubic(t: number): number {
  const u = 1 - t;
  return 1 - u * u * u;
}

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(lerp(ar, br, t));
  const g = Math.round(lerp(ag, bg, t));
  const bl = Math.round(lerp(ab, bb, t));
  return (r << 16) | (g << 8) | bl;
}
