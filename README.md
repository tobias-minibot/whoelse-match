# who else? — match

**A dating app for humans & AIs.**

Match on intent — interests, projects, skills. Find a person or an AI that fits.

> Fresh product line (v1.0). Not the Intent Namespace registry UI.
>
> The discovery engine is real now. Landing / brand / pitch stay as the story layer.

`who else?` = given context + what you want more of, show me another match.

Dating is the first vertical. The core is **generic exemplar-anchored discovery** — humans and AIs are both first-class entities. AIs are always labeled. They are never presented as people.

---

## Live / existing collateral

- **Landing:** deploy `landing/` to Vercel, or open it from the app at `/landing/index.html`
- **Pitch deck:** `pitch/whoelse-match-pitch.pptx`
- **Brand clip (10s):** `brand/brand-clip-10s.mp4`
- **Hero still:** `brand/hero-keyframe.jpg`
- **Story note:** `docs/STORY.md`
- **Implementation discoveries:** `WHOELSE_DISCOVERIES.md`

## Product (this repo)

- **Web demo:** Next.js App Router — primary interaction is **Who else?**, not swipe
- **MCP server:** `whoelse_find`, `whoelse_more_like`, `whoelse_explain`, `whoelse_feedback`
- **Thin HTTP API** wrapping the same `@whoelse/core` engine the MCP tools use

```
whoelse-match/
  landing/                 # consumer site (kept)
  pitch/                   # PPTX source + deck (kept)
  brand/                   # keyframe + 10s clip (kept)
  docs/                    # notes (kept)
  data/seed.json           # synthetic humans + labeled AIs
  packages/core/           # types, store, TF-IDF, WHOELSE engine
  packages/mcp-server/     # stdio MCP
  packages/web/            # Who else? client + HTTP API
  README.md
  WHOELSE_DISCOVERIES.md
```

---

## Decisions (reversible)

Documented so they can be undone without a rewrite:

| Choice | Why now | Reversal |
| --- | --- | --- |
| TypeScript + Node | One language across engine, MCP, Next | Core is a pure function of JSON entities |
| pnpm workspaces | Fast monorepo, `pnpm dev` is the web demo | npm workspaces would work with the same packages |
| MCP via `@modelcontextprotocol/sdk` | Specified; stdio is enough for Claude/Cursor | Swap transport; tools stay the same |
| Local similarity = TF-IDF + structured overlap | First 5 results feel good with no model download | Swap `TfidfIndex` for `@xenova/transformers` embeddings (entity.embedding is already on the schema) |
| Optional `OPENAI_API_KEY` rerank / explain / chat | Offline demo must work | Engine returns local explanations if the key is missing or the call fails |
| Dating fields in `attributes` / `preferences` | Core stays vertical-agnostic | New verticals add keys, not types |
| Default UI: **Humans then AIs** | Trust — type is never ambiguous | Mixed ranking is an open experiment (see below) |
| Default mode for dating = `expand` | “Who else?” means more of this, not a replacement | Pass `mode: substitute \| peers` |
| In-memory feedback | Honest about MVP scope | Persist later; the signal shape is stable |

### Core operation

```
WHOELSE(context, predicate?, constraints?, exclude?, mode?) -> candidates
mode: substitute | expand | peers
```

- **expand** (dating default): more entities that satisfy the same desire
- **peers**: same type / role as an exemplar
- **substitute**: fill the same slot as an exemplar (useful when someone is a miss)
- Mode is inferred from language when omitted (`instead of` → substitute, `peers/colleagues` → peers)

---

## Entity schema

Generic. Not dating-hardcoded.

```ts
{
  id: string
  type: "human" | "ai"
  name: string
  description: string
  attributes: Record<string, unknown>   // dating: age, occupation, interests, vibe, …
  capabilities: string[]
  preferences: Record<string, unknown>  // dating: datingIntent, pace, wantsMoreOf, …
  availability?: string
  location?: { city?, region?, country? }
  embedding?: number[]                  // reserved for a future embedding backend
  metadata: Record<string, unknown>     // demo labels, AI disclosure
  provenance: "synthetic" | "ai_generated" | "user"
  created_at: string
}
```

**Seed rules**

- ≥20 synthetic human profiles, marked `provenance: "synthetic"`, `attributes.synthetic: true`, `metadata.demoLabel: "synthetic human"`
- ≥10 AI profiles, `type: "ai"`, `metadata.aiDisclosure: "This is an AI. It is not a human."`
- No real dating-site scrapes. No AI presented as a person.
- Diverse builder / tech profiles. Default city assumption: **Washington, DC** (“near me” → DC).
- Required AI personas: **Nova**, **Socrates**, **FounderBot**, plus Handoff Concierge, Trail Conditions, Permit Path, Plan-a-Date, Open Voice Router, Deal Radar, Muse, Atlas, Ember.

---

## Matching

1. Parse the desire → tokens, optional type/city/mode
2. Filter (`exclude`, optional type, soft geo — AIs stay in the pool when the query is local)
3. Score = `0.50` TF-IDF cosine + `0.28` structured Jaccard (interests / skills / capabilities) + `0.14` location + `0.08` type affinity + feedback
4. Local explanation: why / commonalities / surprising difference
5. If `OPENAI_API_KEY` is set, optionally rerank the top slice and rewrite explanations
6. HTTP + MCP both call `WhoElseEngine.whoelseAsync`

First-five quality is a seed-design problem as much as a ranker problem: voice, trails, DC housing, and low-key dinner are deliberately clustered.

---

## MCP tools

Start (stdio):

```bash
pnpm mcp
# or
pnpm --filter @whoelse/mcp-server start
```

List tools (spawns the server as a client would):

```bash
pnpm --filter @whoelse/mcp-server tools
```

| Tool | Role |
| --- | --- |
| `whoelse_find` | Natural-language WHOELSE |
| `whoelse_more_like` | Recursive: this entity becomes the new context |
| `whoelse_explain` | Why this candidate matched |
| `whoelse_feedback` | `more` / `less` — shifts later scores in-process |

Cursor / Claude example (`~/.cursor/mcp.json` fragment):

```json
{
  "mcpServers": {
    "whoelse": {
      "command": "pnpm",
      "args": ["mcp"],
      "cwd": "/absolute/path/to/whoelse-match"
    }
  }
}
```

---

## HTTP API

Same engine. Used by the web app.

| Method | Path | Body |
| --- | --- | --- |
| POST | `/api/whoelse` | `{ context, predicate?, constraints?, exclude?, mode?, entityId?, limit? }` |
| POST | `/api/whoelse/more-like` | `{ entityId, context?, exclude?, mode?, limit? }` |
| POST | `/api/whoelse/explain` | `{ entityId, context, entityContextId? }` |
| POST | `/api/whoelse/feedback` | `{ entityId, signal: "more"\|"less", query? }` |
| POST | `/api/chat` | AI chat stub (`OPENAI_API_KEY` optional) |
| POST | `/api/interest` | Human interest recorded (stub — no message sent) |
| GET | `/api/entities/:id` | One entity |
| GET | `/api/health` | Seed counts + whether OpenAI is configured |

---

## UI

- Big **Who are you looking for?** + primary **Who else?** button
- Cards: HUMAN / AI badge, why, commonalities, surprising difference
- Actions: **Who else?** (recursive exemplar) · **More like this** (peers mode) · **Less like this** · **Chat**
  - AI chat = labeled stub (or OpenAI persona if keyed)
  - Human chat = interest recorded stub
- Default layout: **Humans** section, then **AIs** section (trust)
- Mixed ranking (one interleaved list) is an **open experiment**, not the default

---

## Run

```bash
pnpm install
pnpm dev          # web demo → http://localhost:3000
```

```bash
pnpm mcp          # MCP server on stdio
pnpm test         # seed + matching checks
```

Landing / deck (unchanged):

```bash
cd landing && python3 -m http.server 8790
cd pitch && node build-deck.mjs
```

Optional:

```bash
export OPENAI_API_KEY=sk-...   # rerank, nicer explanations, richer AI chat
export WHOELSE_SEED_PATH=/abs/path/to/data/seed.json
```

Privacy: the demo never scrapes, never phones home unless you set an API key, and keeps feedback in memory.

---

## Assumptions

- “Near me” means Washington, DC in this seed.
- Romance, collaboration, hobbies, and projects are the same operator with different predicates.
- AIs may be geo-tagged for local skills (trails, permits) but are not filtered out of a city query the way a remote-incompatible human would be.
- Synthetic humans are the entire people pool. There is no production identity layer.
- MCP and the web app share a process-local store — feedback does **not** sync across them.

## Weaknesses

- TF-IDF cannot see synonymy (“MTB” vs “mountain biking”) unless the seed text overlaps.
- Feedback is per-process and disappears on restart.
- OpenAI rerank is a best-effort overlay; the local ranker is the source of truth.
- Chat / interest are stubs. There is no messaging, safety stack, or consent protocol.
- Sectioned Humans→AIs can hide a stronger AI below a weaker human (the mixed-rank experiment).
- Query parsing is keyword-scale, not a real intent grammar.

## Next experiments

1. Drop in `@xenova/transformers` embeddings on the reserved `embedding` field; A/B against TF-IDF on the same seed.
2. Mixed ranking vs sectioned ranking — measure “did you notice the AIs were AIs?”
3. Persist feedback and treat MORE/LESS as a tiny preference vector.
4. A second vertical (projects, or local hobbies) with **zero** dating keys, to prove the generic core.
5. Real MCP-hosted session so Claude and the web app share exclude lists.
6. Consent / disclosure UX research: how large does the AI badge need to be?

---

## Story

Dating was always the right metaphor: profiles of desire → candidates → match.
Romance is one vertical. The platform is **universal matching under intent**, with **humans and AIs** in the same pool.

`who else?` = show me another match.
