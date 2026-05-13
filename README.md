# strat-sim

Multiplayer turn-based strategy game for teaching undergraduate business strategy.
Players run an AI-wearable company, allocate R&D / marketing / capacity / pricing each turn,
and compete for market share among ~250 simulated consumers in an isometric town.
First to a market-cap threshold (or highest at turn 10) wins.

## Layout

```
packages/
  shared/   types & constants shared by all apps
  sim/      pure-TS simulation engine (consumers, adoption, finance, bots)
apps/
  web/      React + Vite + Pixi.js client (single-player vs bots for v0.1)
  server/   Fastify HTTP API exposing the same actions for LLM agents
```

The `sim` package has no DOM/Node deps — it runs identically in the browser
(for solo play vs. local bots) and on the server (for multiplayer / LLM API).

## Develop

```sh
pnpm install
pnpm test               # run sim tests
pnpm sim:demo           # play 5 bot-vs-bot matches and print results
pnpm dev:web            # start the React client on :5173
pnpm dev:server         # start the Fastify API on :3001
```

## v0.1 scope (current)

- Single-player vs. 3 rule-based bots (low-cost / premium / niche).
- Isometric town view + side-panel decision UI.
- Local in-memory state, no auth.
- LLM `observe` / `act` HTTP endpoints stubbed against the same engine.

## Roadmap

- v0.2 — class-code login, WebSocket multiplayer (2–4 players, simultaneous turns).
- v0.3 — instructor dashboard.
- v0.4 — public LLM API + sample Python client.
