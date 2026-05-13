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
pnpm dev                 # start server (:3001) and web (:5173) together
# or, in separate terminals:
pnpm dev:server
pnpm dev:web
```

Open `http://localhost:5173`. The landing screen offers three modes:

- **Play solo vs bots** — completely client-side, no server required.
- **Join a class** — enter a 5-character match code + your name; lands you
  in a lobby and then the game.
- **Instructor: create a class** — gives you a class code (share with
  students), a dashboard of matches in the class, and a button to mint
  AI-agent API tokens.

## Testing it yourself

### 1. Solo mode (fastest sanity check)

```sh
pnpm dev:web
```

Open `http://localhost:5173`, click **Play solo vs bots**, submit turns. You
play vs three rule-based bots (Costco / Apple / Whoop archetypes).

### 2. Multiplayer with two browser windows

```sh
pnpm dev
```

Open `http://localhost:5173` in two windows (or two different browsers, or a
normal + incognito window — the lobby state lives on the server, so any
combination works).

- **Window A**: Instructor → Create a class. Note the 6-char class code, click
  *New match*. Note the 5-char match code (e.g. `CV4N5`).
- **Window B** (the student): click **Join a class**, paste the match code,
  enter a name like *Alice*, click *Join*. You'll see the lobby with one
  player. The first joiner is the host.
- *(Optional)* Open a third window, join as *Bob* — you'll see Alice's lobby
  update live over WebSocket.
- In the host's window, click *Start match*. Empty seats are filled with bots.
- Each window submits its decisions independently; the server resolves the
  turn once all humans have submitted, then pushes the new state to everyone.
  You'll see a "waiting on N players" toast after you submit.
- Back in the instructor window (`#/instructor/<classcode>`), click the match
  in the list — you'll see a turn-by-turn audit of every player's pricing,
  R&D, marketing, and capacity choices.

### 3. Skip the clicking with `pnpm seed`

If you just want to verify the whole stack works without clicking through
the instructor flow, run the seed script:

```sh
pnpm dev          # leave running in one terminal
pnpm seed         # in another terminal
```

`pnpm seed` will print:

- a fresh class code
- a fresh match code
- an instructor token
- an AI agent API token + match id, ready to drop into the Python sample
- copy-pasteable curl and python commands

### 4. LLM agent test

After `pnpm seed`, copy the three exported env vars it prints:

```sh
export STRAT_SIM_URL=http://localhost:3001
export STRAT_SIM_MATCH=<the match id it printed>
export STRAT_SIM_TOKEN=<the AI token it printed>

# Start the match first by joining as a human (one student is enough; the
# rest will be bots), then:
python examples/python/strat_sim_agent.py
```

The agent will observe, decide, act in a loop until the match ends.

### 5. Just curl the API

```sh
# observe
curl -s -H "Authorization: Bearer $STRAT_SIM_TOKEN" \
  http://localhost:3001/api/llm/matches/$STRAT_SIM_MATCH/observe | jq

# act
curl -s -X POST -H "Authorization: Bearer $STRAT_SIM_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"companyId":"p1","price":299,"subscriptionPrice":0,
       "rd":{"privacy":1,"capability":2,"design":2,"wellness":1},
       "marketing":{"total":40000,"segmentTarget":"broad"},
       "capacityInvestment":15}' \
  http://localhost:3001/api/llm/matches/$STRAT_SIM_MATCH/act
```

### 6. Automated tests

```sh
pnpm test                # 22 tests: sim engine (15) + server REST + WS (7)
pnpm typecheck           # type-check all four packages
pnpm sim:demo            # bot tournament; sanity-checks balance
```

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
