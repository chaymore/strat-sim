# Strategy Dungeon — Meeting Summary & MVP PRD

> Source: "Strat Sim 6/25" working session (Caleb Haymore + Prof. Ryan Allen).
> Status: Direction-setting / pre-build. Don't over-anchor on any single framing below —
> this captures the conversation and proposes an MVP, not a frozen spec.

---

## 1. Summary of the conversation

### Where we started
We were demoing the **current strat-sim** — the deterministic, turn-based, button-clicking
game (an AI-wearable company; players allocate price / R&D / marketing / capacity each turn
and compete for ~250 simulated consumers; see `README.md`). Two things stood out while clicking
around:

1. **Investment vs. level should probably be decoupled.** Right now "accuracy of digital
   tracking" (and the other capabilities) are a single number — what you spent last turn *is*
   your level. But conceptually there are two distinct levers:
   - **Investment** = an upfront fixed cost to *build/integrate* a capability (move it from a
     bought modular component to something you own and can produce cheaply/uniquely).
   - **Level** = where you then *set* that capability for your product.

   Decoupling them unlocks real strategy: invest heavily + set level low → low-cost
   positioning; invest heavily + set level high → differentiation nobody else can match.
   Today they're conflated, and the capability bars also look like pure functions of
   last-turn spend rather than an accumulation over time.

2. **The deterministic game has a ceiling.** The UI is good and "something like this will
   work," but the devil is in the dynamics/balance. The bots are weak, spending a ton trivially
   wins, and the numbers don't mean much early. More fundamentally, it teaches *trading off
   within a fixed market* — a real lesson, but not the thing the strategy-sim market is
   actually missing.

### The pivot: "Strategy Dungeon"
Inspired by **AI Dungeon** (open-ended, LLM-driven text adventure). The insight: the magic
isn't "make up anything" — it's pairing that open-endedness with a **fair, hidden constraint
engine** so the world *pushes back realistically*. A few key principles emerged:

- **Open enough to be fun, constrained enough to be realistic.** You can propose any strategy
  ("I'll hire the best team and build something 3× better than the iPhone"), but the engine
  pushes back based on budget, capital markets, willingness-to-pay ceilings, time, capability,
  etc. ("you had $4M, you hired 2 researchers, you have interesting software but not a product").
- **Theory-based play (the "Value Lab" idea).** Players win by forming a *unique theory of
  value* — a belief about a latent/under-served value dimension — then **testing hypotheses**
  against a hidden market reality (à la Airbnb: "people *will* sleep in a stranger's home *if*
  you solve trust → escrow + ratings + great photos"). Some theories pay off big; most paths
  don't work. The lesson is how fast you learn and pivot.
- **Seeded hidden potentials, not infinite realism.** We can't simulate the whole world. So we
  **pre-seed ~15–20 plausible "hidden structures"** (real market patterns: compliance-grade
  auditability is undervalued; the real bottleneck is implementation risk not features;
  vertical-specific beats horizontal; etc.). Each has predefined hidden effects (which segments
  shift, WTP changes, adoption delays, required capabilities). Player attempts get *funneled*
  toward these seeded paths; off-path ideas are gently constrained rather than rewarded.
- **A real (but parsimonious) engine in the background.** Not necessarily Python. The world is
  governed by a **small set of simple, agreed-upon economic rules** (e.g. WTP falls as price
  rises unless luxury; brand equity raises WTP + awareness but decays over time; adoption is a
  lagged diffusion process). Complexity should be **emergent** from a few interacting rules with
  feedback — *not* hand-coded complexity. This is also what keeps the LLM from "favoring" any
  player: there's a neutral arbiter, which matters even more in multiplayer (helping one player
  hurts another).
- **Realism doc as a guardrail.** A dedicated "realism" layer prevents the iPhone-3×-better
  exploit while still allowing genuine contrarian hypotheses to succeed. The LLM is *not* trusted
  to judge realism on its own — the seeded paths + constraint docs do that job.

### Architecture sketch (as discussed, not final)
- **A long, structured system prompt** + **a file/folder structure of documentation** the LLM
  reads on demand (like Claude Code reading repo docs):
  - **Constraint docs** — how budget/financing (debt vs. equity, rates), segments, adoption,
    capacity, brand, etc. work.
  - **Possibility docs** — e.g. ~5 business models (subscription vs. one-time hardware, etc.),
    each with considerations/tradeoffs.
  - **Customer/segment docs** — how each segment's mind works: WTP per attribute + *hidden*
    value dimensions discoverable via hypothesis testing.
  - **Realism doc** — the guardrails.
- **Per-entity game-state files** (per product, per player, per game) holding **actual numeric
  variables** carried turn-to-turn — so state is real and persistent, not vibes.
- Likely an **n8n-style branching flow / tool-calling pipeline**: each turn feeds prior
  variables + player actions + relevant docs into the model to generate the next world state,
  then branches forward.
- **Randomized-but-bounded start:** each new game varies starting conditions and which hidden
  potentials are live, but the underlying rules stay constant (also defeats students reverse-
  engineering the mechanics).
- **Model/cost:** worth using a strong model (best real-world knowledge). Build on Claude Max
  subscription; run the game itself via **OpenRouter** on a **separate billing project**, with a
  dedicated API key handed to Caleb (Allen already has research credits earmarked for this; will
  test open models — DeepSeek, GLM, etc.). New repo: **"strategy-dungeon."**

### Scope discussion (single vs. multi, time model)
- **Single-player** is easier (system prompt can openly bias the engine to be a tough, neutral
  arbiter without "favoring" anyone) and removes the wait-for-others pain of the old sim.
- **Multiplayer** is what makes it special (live brains, shared evolving game state, neutral
  arbiter), but adds a lot of complexity.
- **Time:** old sim must be turn-based. Strategy Dungeon could be turn-based *or* use a
  **running real-world clock** ("30s elapsed ≈ a couple weeks") that the model factors in — the
  coolest/most-complex version is real-time multiplayer. Time is more fluid in tech contexts.
- **Grading angle (future):** grade on *process quality* (good inputs/reasoning along the way),
  not just final market cap — so a good player with a bad draw still scores well, and
  low-effort/abusive play scores poorly. Great for case competitions.

### Agreed direction
Both are excited; this plays to LLM strengths (the model has "already aggregated the whole real
world"; we just set limits). Acknowledged risk: distilling the real world into docs is genuinely
hard and might not work — **but worth trying.** Decision: **build the simplest possible version
first.**

### MVP decision (explicit)
- **Single player, turn-based.**
- **One industry**, somewhat **tech / emerging** so there are no strong priors and real room for
  hypotheses — leaning **AI wearable / wearables**.
- **3–4 of the most basic engine constraints** (e.g. brand, capabilities, customer WTP per
  attribute, + maybe one more).
- **4–5 non-obvious features / hidden potentials** (incl. at least one business-model choice like
  subscription vs. one-time).
- Feed the model the **vision** + a **few simple rules + a few possibilities** and let it find a
  parsimonious rule set. Allen will seed initial **constraint docs** via research runs for Caleb
  to audit. Don't contaminate the MVP with the old theory-heavy doc yet.

---

## 2. PRD — Strategy Dungeon MVP

### 2.1 One-liner
An LLM-driven, single-player, turn-based business-strategy game where the player runs a startup
in an emerging AI-wearable market, proposes open-ended strategic actions in natural language, and
a neutral, document-grounded "constraint engine" simulates realistic outcomes against a hidden
market structure they must discover.

### 2.2 Goals
- Prove the core loop is **fun and feels realistic** with a minimal rule set.
- Demonstrate that an LLM + structured docs + persisted numeric state can act as a **fair,
  deterministic-enough arbiter** that pushes back on unrealistic actions yet rewards genuine
  insight.
- Validate that **hidden value dimensions** can be discovered through hypothesis testing and
  meaningfully change outcomes.

### 2.3 Non-goals (explicitly out for MVP)
- Multiplayer; real-time clock; image generation.
- Grading/assessment system.
- Multiple industries; persistence beyond a single playthrough (DB, auth, leaderboards).
- Fancy isometric/town UI. A clean chat + state-panel UI is enough.
- Importing the old theory-heavy brainstorm doc into the rules.

### 2.4 Target user
A business-strategy student (or the professor demoing in class) playing a ~30–45 min solo
session.

### 2.5 Core experience / game loop
1. **Game start:** a brief generated scenario sets the market, the player's starting company
   (cash, a baseline product, basic capabilities/brand), and visible market signals. Starting
   conditions and which hidden potentials are "live" are randomized within bounds; rules are
   constant.
2. **Each turn the player can, in free-form natural language:**
   - Take strategic actions (set/adjust price & business model, invest in a capability, run
     marketing, add capacity, finance via debt/equity, run a customer survey / experiment, etc.).
   - Propose and test a **hypothesis** about latent customer value.
3. **The engine resolves the turn** against constraint docs + hidden market structure + persisted
   numeric state, and returns a **turn report**: what happened, updated visible metrics, any
   clues surfaced, and the pushback/realism notes ("with $4M you could only…").
4. **State advances**; repeat for a fixed number of turns (suggest **8–10**). End with a summary
   of how the player's theory played out.

### 2.6 The constraint engine (MVP rule set)
Keep it **parsimonious** — a few simple rules whose interaction produces emergent complexity.
Start with **3–4 constraint domains**:

1. **Customer WTP per attribute** — each segment has a willingness-to-pay weight on a small set
   of visible attributes (e.g. accuracy/capability, design, privacy, wellness) **plus 1–2 hidden
   value dimensions** that are under-served and only revealed through hypothesis testing /
   surveys. WTP falls as price rises (unless positioned as luxury).
2. **Capabilities (decoupled investment vs. level)** — investing is an upfront fixed cost that
   *lowers the marginal cost / raises the ceiling* of a capability; the player then *sets the
   level* per product. Capabilities **accumulate** across turns (not last-turn-only) and may
   slowly decay.
3. **Brand equity** — raises WTP and awareness; **decays over time**; built via marketing +
   consistent positioning.
4. **Finance & capacity (budget governor)** — cash, optional debt (≈10% interest) and equity;
   capacity caps how much demand you can actually fulfill (unmet demand is lost). This is the
   "governor on willingness to pay / what's achievable" that makes pushback realistic.

Adoption: a **lagged diffusion process** (early adopters first, mainstream as the product gets
"good enough" and brand/awareness build).

### 2.7 Hidden potentials (seeded)
- Author **4–5 seeded hidden structures** for the wearables market (real-world patterns), e.g.:
  a small segment with high WTP for compliance/privacy-grade data handling; the real bottleneck
  is trust/implementation risk not features; a vertical-specific wearable beats a broad one; a
  subscription model unlocks a price-sensitive segment by offsetting hardware cost; an
  under-served "wellness outcomes, not metrics" dimension.
- Each seeded structure has a **predefined hidden effect**: which segment(s) shift, WTP delta,
  adoption delay, and **required capabilities** to actually capture it.
- Player actions are **funneled** toward the live seeded paths; off-path actions get realistic
  constraint pushback rather than reward.

### 2.8 Possibility / business-model options
At minimum support a meaningful **business-model choice** with real tradeoffs:
- **One-time hardware** (high upfront cost to customer, no churn) vs.
- **Subscription** (harder to sign up, but offsets the customer's upfront hardware cost; recurring
  revenue, churn to re-earn).

### 2.9 System design (MVP)
- **System prompt** encoding: the vision, the player's role, turn structure, the "neutral tough
  arbiter / realism-first" stance, and instructions to read the relevant docs before responding.
- **Doc store** (markdown files), categorized:
  - `constraints/` — finance, segments, adoption, capacity, brand, capabilities.
  - `possibilities/` — business models and their considerations.
  - `customers/` — per-segment minds: WTP weights + hidden value dimensions.
  - `realism.md` — guardrails (e.g. no "3× iPhone overnight"; budget→hiring→output realism).
  - `hidden/` — the 4–5 seeded structures (kept out of the player-visible context).
- **Game-state store** — JSON/markdown per game holding **actual numeric variables** (cash,
  capability levels & investments, brand equity, capacity, installed base, segment states, which
  hidden potentials are live + discovered) carried turn-to-turn.
- **Turn pipeline** (n8n-style branching or a simple tool-calling loop): inputs = prior state +
  player action + retrieved relevant docs → model produces (a) updated numeric state and (b) the
  player-facing turn report. Persist state, branch to next turn.
- **Determinism/consistency:** lean on persisted numeric state + tight docs + retrieval so
  outputs stay within constraints turn-over-turn (the hard LLM-determinism problem to manage).

### 2.10 Tech / infra
- **New repo:** `strategy-dungeon` (Allen + Caleb as owners).
- **Web front end** (chat-style action input + a side panel showing current numeric game state /
  metrics) → back end orchestrates the prompt + docs + state, similar to Caleb's existing
  OpenAI-API "Milo" assistant.
- **Models via OpenRouter**, **separate billing project + dedicated API key** for Caleb (Allen
  funds via earmarked research credits). Use a strong model for quality; test cheaper open models
  (DeepSeek, GLM-style) for cost. Keys aren't model-scoped, so switching models mid-build is easy.
- Reuse from current `strat-sim` where helpful: segment/WTP/adoption/brand modeling concepts and
  the wearables framing already exist in `packages/sim` and can inform the constraint docs.

### 2.11 Open questions
- **Time model for single player:** strict turns vs. a "fluid time" report between actions
  (decision deferred; MVP = turn-based).
- How explicitly to surface **clues** vs. forcing discovery purely through experiments/surveys.
- How much numeric state the model maintains itself vs. a deterministic helper computing key
  variables.
- Exact turn count and win/end condition for the MVP.
- Which strong model gives the best realism-per-dollar.

### 2.12 MVP success criteria
- A full solo playthrough (≈8–10 turns) runs end-to-end with **persistent, sensible numeric
  state**.
- The engine **pushes back realistically** on an over-reach (the "3× iPhone" test) **and** lets a
  genuine contrarian hypothesis pay off (at least one seeded hidden potential is discoverable and
  visibly changes outcomes).
- Two playthroughs differ in starting conditions / live potentials but obey the same rules.
- A first-time player reports it felt **both fun and realistic** — the core bet.

### 2.13 Suggested build order
1. Author the **minimal doc set** (3–4 constraint docs + customers + realism + 4–5 hidden
   structures) — Allen seeds via research runs, Caleb audits.
2. Define the **game-state schema** (numeric variables carried turn-to-turn).
3. Build the **turn pipeline** (state + action + retrieved docs → new state + report) against a
   strong OpenRouter model; CLI/text first.
4. Wrap in a **minimal web UI** (action input + state panel).
5. Playtest, tune the realism guardrails and the funneling toward seeded potentials.
