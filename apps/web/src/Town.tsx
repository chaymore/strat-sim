import { useEffect, useRef } from "react";
import { Application, Container, Graphics } from "pixi.js";
import type { ObservationView } from "@strat-sim/shared";

const TILE_W = 28;
const TILE_H = 14;
const COLORS: Record<string, number> = {
  you: 0x4cc2ff,
  low: 0xffb84c,
  prem: 0xff5fa2,
  niche: 0x8aff7a,
};
const NEUTRAL = 0x6c6c78;

function isoProject(x: number, y: number): { px: number; py: number } {
  return {
    px: (x - y) * (TILE_W / 2),
    py: (x + y) * (TILE_H / 2),
  };
}

export function Town({ observation }: { observation: ObservationView }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const layerRef = useRef<Container | null>(null);

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
          // Cleanup ran before init resolved — destroy now that it's safe.
          try {
            app.destroy(true, { children: true });
          } catch {
            // pixi may already be partially torn down
          }
          return;
        }
        host.appendChild(app.canvas);
        const root = new Container();
        root.position.set(host.clientWidth / 2, 60);
        app.stage.addChild(root);
        layerRef.current = root;
        appRef.current = app;
        drawConsumers(root, observation);
      })
      .catch(() => {
        // swallow init errors during StrictMode double-mount churn
      });
    return () => {
      cancelled = true;
      if (initialized) {
        try {
          app.destroy(true, { children: true });
        } catch {
          // ignore
        }
      }
      appRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (layerRef.current) drawConsumers(layerRef.current, observation);
  }, [observation]);

  return <div ref={hostRef} style={{ position: "absolute", inset: 0 }} />;
}

function drawConsumers(layer: Container, observation: ObservationView) {
  layer.removeChildren();
  // sort by y for paint order
  const sorted = [...observation.consumers].sort((a, b) => a.position.y - b.position.y);
  for (const c of sorted) {
    const { px, py } = isoProject(c.position.x, c.position.y);
    const color = c.adopted ? (COLORS[c.adopted] ?? 0xffffff) : NEUTRAL;
    const g = new Graphics();
    // body
    g.roundRect(-3, -10, 6, 10, 2).fill(color);
    // head
    g.circle(0, -13, 3).fill(color);
    g.position.set(px, py);
    layer.addChild(g);
  }
}
