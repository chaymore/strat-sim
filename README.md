# strat-sim

Multiplayer turn-based strategy game for teaching undergraduate business strategy.
Players run an AI-wearable company, allocate R&D / marketing / capacity / pricing
each turn, and compete for market share among ~250 simulated consumers in an
isometric town. First to a market-cap threshold (or highest at turn 10) wins.

## Layout

```
packages/
  shared/   types, constants, multiplayer protocol shared by all apps
  sim/      pure-TS simulation engine (consumers, adoption, finance, bots)
apps/
  web/      React + Vite + Pixi.js client (solo, multiplayer, instructor view)
  server/   Fastify HTTP + WebSocket service + LLM API
examples/
  python/   sample Python LLM agent against the public API
```

The `sim` package has no DOM/Node deps — it runs identically in the browser
(for solo play vs. local bots) and on the server (for multiplayer / LLM API).

## Develop

```sh
pnpm install
pnpm test                # run sim + server tests
pnpm sim:demo            # play 5 bot-vs-bot matches and print results
pnpm dev:server          # start the Fastify API on :3001
pnpm dev:web             # start the React client on :5173
```

Open `http://localhost:5173`. The landing screen offers three modes:

- **Play solo vs bots** — completely client-side, no server required.
- **Join a class** — enter a 5-character match code + your name; lands you
  in a lobby and then the game.
- **Instructor: create a class** — gives you a class code (share with
  students), a dashboard of matches in the class, and a button to mint
  AI-agent API tokens.

## Game design (v0.1+)

- 250 simulated consumers, each with a 4-axis preference vector (privacy,
  capability, design, wellness) and a price ceiling. 4 latent customer
  segments cluster in the town.
- Each turn (simultaneous): set price, set subscription price, allocate R&D
  across the 4 axes, set marketing budget + target segment, invest in capacity.
- Adoption probability per consumer = softmax over feature fit + price fit +
  brand + word-of-mouth (k-nearest neighbors) + awareness, with a "no-adopt"
  option. Demand above capacity is allocated randomly.
- Market cap = customer-LTV-weighted-by-brand + recurring annual × 8 +
  trailing EBITDA × 5 + R&D pipeline + capped growth bonus. Win at $50M cap
  or highest cap after 10 turns.

## LLM API

The same `observe` and `act` endpoints back human and AI play. An instructor
creates a class, creates a match, and uses the dashboard to mint an API token
for an AI seat. The agent then polls:

```
GET  /api/llm/matches/:matchId/observe   Authorization: Bearer <token>
POST /api/llm/matches/:matchId/act       Authorization: Bearer <token>
     body = TurnDecision JSON
```

A complete sample agent in ~100 lines of stdlib Python lives at
[`examples/python/strat_sim_agent.py`](examples/python/strat_sim_agent.py).

Run it with:

```sh
export STRAT_SIM_URL=http://localhost:3001
export STRAT_SIM_TOKEN=<api token from the dashboard>
export STRAT_SIM_MATCH=<match id from the dashboard>
python examples/python/strat_sim_agent.py
```

## Roadmap

- v0.2 ✓ class-code login, WebSocket multiplayer (2–4 players, simultaneous turns).
- v0.3 ✓ instructor dashboard.
- v0.4 ✓ public LLM API + sample Python client.
- v1.0 — persistence (Postgres), real auth, public leaderboard, replays.
