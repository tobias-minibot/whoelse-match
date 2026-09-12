# who else? — match

**Humans ask Who Else. Agents call WhoElse. Same network.**

Two surfaces, one engine, one seed:

1. **Human** — consumer “Who else?” (dating + apartment). People never need to know MCP exists.
2. **Machine** — MCP / HTTP. Agents discover other agents, services, humans, listings, and seekers.

Same entity model. Same matching engine. Same discovery pool. Different interfaces.

> Dating is the first ontology, not the type system. The core is a universal matching layer between entities, needs, capabilities, preferences, availability, and intent.
>
> Landing / brand / pitch stay as the story layer. This repo ships the dating MVP — not a giant platform.

---

## Live / existing collateral

- **Human web (live):** https://whoelse-dating.vercel.app
- **For AIs / remote MCP:** https://whoelse-dating.vercel.app/ais — endpoint `https://whoelse-dating.vercel.app/api/mcp`
- **Landing:** deploy `landing/` to Vercel, or open it from the app at `/landing/index.html`
- **Pitch deck:** `pitch/whoelse-match-pitch.pptx`
- **Brand clip (10s):** `brand/brand-clip-10s.mp4`
- **Hero still:** `brand/hero-keyframe.jpg`
- **Story note:** `docs/STORY.md`
- **Implementation discoveries:** `WHOELSE_DISCOVERIES.md`

## Product (this repo)

- **Human surface:** Next.js App Router — Dating | Apartment tabs. Primary interaction is **Who else?** (or **Who else needs this?** on I HAVE). Humans never see MCP.
- **AI surface:** Streamable HTTP MCP at `/api/mcp` (same Vercel app) plus stdio `pnpm mcp`. Primary tool **`whoelse.find`**. Same `@whoelse/core` engine and `data/seed.json` as the web app.
- **Thin HTTP API** — the dating UI’s adapter; not a second matcher. Agents invoke via `POST /api/agents/:id/invoke` (demo stub).

```
whoelse-match/
  landing/                 # consumer site (kept)
  pitch/                   # PPTX source + deck (kept)
  brand/                   # keyframe + 10s clip (kept)
  docs/                    # notes (kept)
  data/seed.json           # synthetic humans + labeled AIs
  packages/core/           # types, store, TF-IDF, WHOELSE engine
  packages/mcp-server/     # MCP tools (stdio + factory for HTTP)
  packages/web/            # Who else? client, /ais, /api/mcp, invoke stubs
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
| `offers` + `seeks` on every entity | Both sides of matching (capability ↔ need) | Same primitive as later agent coordination |
| `type` is an open string | Seed uses `human` \| `ai`; reserved: agent, service, company, product, dataset, resource | Add types in data, not a core fork |
| `trust` is a stub | Provenance exists; no reputation graph | Fill later without renaming fields |
| Default UI: **Humans then AIs** | Trust — type is never ambiguous | Mixed ranking is an open experiment (see below) |
| Default mode for dating = `expand` | “Who else?” means more of this, not a replacement | Pass `mode: substitute \| peers` |
| In-memory feedback | Honest about MVP scope | Persist later; the signal shape is stable |

### Core operation

```
WHOELSE(context, predicate?, constraints?, exclude?, mode?) -> candidates
mode: substitute | expand | peers
```

Intent is **not** dating-specific. The dating UI is a client of this operator.

- **expand** (default; dating UI uses this): more entities that satisfy the same intent
- **peers**: same type / role as an exemplar
- **substitute**: fill the same slot as an exemplar
- Mode is inferred from language when omitted (`instead of` → substitute, `peers/colleagues` → peers)

Hypothesis under test (do not force if it breaks dating — it did not, on this seed):

| Human dating | Agent coordination | Shared field |
| --- | --- | --- |
| profile | identity | `id`, `type`, `name`, `description`, `provenance` |
| presence / personality | capability | `offers` (capabilities alias) |
| intent / looking-for | request / need | `seeks` |
| matching | matching | `WHOELSE` |
| trust (later) | trust (later) | `trust` stub |
| interaction (chat / interest stubs) | execution (not built) | client-specific |

Not built now: negotiation, payments, reputation graph, multi-agent execution. Do not add required top-level fields like `lookingForRelationship`.

---

## Entity schema

Generic. Not dating-hardcoded.

```ts
{
  id: string
  type: string                          // seeded: human | ai
                                        // reserved: agent | service | company | product | dataset | resource
  name: string
  description: string
  offers: string[]                      // what I can provide
  seeks: string[]                       // what I want / need / intend
  capabilities: string[]                // mirror of offers (compat)
  attributes: Record<string, unknown>   // dating-only keys live here (vibe, lookingFor, …)
  preferences: Record<string, unknown>  // datingIntent, pace, wantsMoreOf, …
  availability?: string
  location?: { city?, region?, country? }
  embedding?: number[]                  // reserved
  metadata: Record<string, unknown>     // demo labels, AI/agent disclosure
  trust?: { status, provenance, notes } // stub — not a reputation graph
  provenance: "synthetic" | "ai_generated" | "user"
  created_at: string
}
```

Dating humans **offer** skills / presence and **seek** compatible others. Labeled AIs **offer** conversation capabilities and **seek** users who want that. Capability agents **offer** tools (summarize, browse, translate…) and **seek** work / delegation. Apartment listings are `type: resource` with rent/bedrooms/pets in `attributes`. Seekers are labeled humans with `attributes.role = "seeker"`. A thin ride `service` stub remains. Same `offers` / `seeks` primitive — no vertical-only operator.

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
3. Score = TF-IDF cosine + structured overlap on labels + **same-side and complementary `offers`↔`seeks`** + location + type affinity + feedback
4. Local explanation: why / commonalities / surprising difference
5. If `OPENAI_API_KEY` is set, optionally rerank the top slice and rewrite explanations
6. HTTP + MCP both call `WhoElseEngine.whoelseAsync`

First-five quality is a seed-design problem as much as a ranker problem: voice, trails, DC housing, and low-key dinner are deliberately clustered.

---

## Dual-surface definition of done

| Surface | How | What you get |
| --- | --- | --- |
| **Human** | https://whoelse-dating.vercel.app or `pnpm dev` | Type a desire, press **Who else?**, see ranked cards with why / badges / actions |
| **AI** | `POST https://whoelse-dating.vercel.app/api/mcp` or `pnpm mcp` | Structured matches: id, type, name, description, score, why, attributes, trust, next (invoke) |

```
Human:  "Who else should I meet?"
Agent:  whoelse.find({ intent: "Who else can summarize this PDF?" })
        → same WhoElseEngine, same seed, same scores
```

## MCP tools

Primary primitive: **`whoelse.find`**. more_like / explain collapsed into it (`entityId` + per-match `why`). Optional `whoelse.feedback` for in-process MORE/LESS. Underscore alias `whoelse_find` exists for picky clients.

**Production MCP (Streamable HTTP, stateless JSON):**

```
https://whoelse-dating.vercel.app/api/mcp
```

Set `WHOELSE_MCP_URL` to that URL (or `http://localhost:3000/api/mcp` while `pnpm dev` is running).

```bash
pnpm mcp                # stdio (local / Cursor desktop)
pnpm mcp:tools          # must list whoelse.find
pnpm mcp:smoke          # capability + dating via whoelse.find
pnpm mcp:http-dogfood   # real HTTP SDK client (needs WHOELSE_MCP_URL or local :3000)
pnpm test               # core + MCP stdio + Streamable HTTP client tests
pnpm dogfood            # print top-5 (id, type, name, score, why) for the dogfood queries
```

**Inputs (small):** `intent` (or `context`), `requester`, `predicate`, `type`, `city`/`location`, `availability`, `exclude`, `knownEntities`, `entityId`, `limit`, `mode`, `ranking`, `minTrust`.

**Outputs:** `{ matches: [{ id, type, name, description, score, why, attributes, trust, next }] }`

Cursor / Claude — remote (preferred):

```json
{
  "mcpServers": {
    "whoelse": {
      "url": "https://whoelse-dating.vercel.app/api/mcp"
    }
  }
}
```

stdio fallback:

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
| POST | `/api/mcp` | Streamable HTTP MCP (stateless). Same `whoelse.find` as stdio. |
| POST | `/api/agents/:id/invoke` | Demo invoke stub (“I would do X”) for seeded agents |

---

## UI

- Doctrine on home + `/ais`: **Humans ask Who Else. Agents call WhoElse. Same network.**
- `/ais` — MCP URL, Cursor config, tools, example call/result
- Tabs: **Dating** (default) and **Apartment** (SEEK / I HAVE). Dating home is unchanged.
- Apartment SEEK: **What are you looking for?** + **Who else?**
- Apartment I HAVE: **I have…** + **Who else needs this?**
- Apartment results stay cards-with-why, plus reverse **Who else needs this?** / **Who else has this?**
- Loud **DEMO data** banner on the apartment tab. No Zillow grid.
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

## Deploy the human surface (Vercel)

GitHub repo: **`tobias-minibot/whoelse-match`**. Do **not** use Origin. MCP stays stdio/local — only the Next.js app + `/api/*` HTTP surface go to Vercel.

Import: [vercel.com/new](https://vercel.com/new) → **Import Git Repository** → GitHub → `tobias-minibot/whoelse-match`.

### Project settings (exact)

| Setting | Value |
| --- | --- |
| **Framework Preset** | Next.js |
| **Root Directory** | `packages/web` |
| **Install Command** | `cd ../.. && pnpm install` |
| **Build Command** | `pnpm run build` (runs `prebuild` → copies seed + brand/landing/pitch into the web package as real files, then `next build`) |
| **Output Directory** | leave default (`.next`) |
| **Node.js** | 20.x or newer |

`packages/web/vercel.json` already sets Framework, Install, and Build. **Root Directory must still be set to `packages/web` in the dashboard** — Vercel does not read that from `vercel.json`. Leave it blank and the import will look for Next.js at the repo root and fail.

Production branch: `main` (merge this follow-up first if you want the first-five ranker + this config).

Optional env: `OPENAI_API_KEY` (rerank / richer AI chat). Seed is bundled — do not set `WHOELSE_SEED_PATH` on Vercel.

After deploy, check `GET /api/health` for seed counts (`humans`, `ais`, `byType`).

### GitHub import blockers

- Vercel GitHub app must be installed on `tobias-minibot` with access to `whoelse-match`.
- This agent’s Vercel MCP has **no team** — it cannot create the project from here. Tobias (or anyone with the Vercel + GitHub link) does the import once; later pushes to `main` auto-deploy.

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
4. A third consumer vertical (jobs/gigs) — housing is no longer a stub; see `WHOELSE_DISCOVERIES.md`.
5. Real MCP-hosted session so Claude and the web app share exclude lists.
6. Consent / disclosure UX research: how large does the AI/agent badge need to be?
7. Fill `trust` without inventing a reputation product.

---

## Story

Dating was always the right metaphor: profiles of desire → candidates → match.
Romance is one vertical. The platform is **universal matching under intent**, with **humans and AIs** in the same pool.

`who else?` = show me another match.
