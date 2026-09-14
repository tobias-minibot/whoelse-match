# who else? — match

**Humans ask Who Else. Agents call WhoElse. Same network.**

Two surfaces, one engine, one seed:

1. **Human** — consumer “Who else?” (dating, apartment, jobs, plus experimental factory lenses). People never need to know MCP exists.
2. **Machine** — MCP / HTTP. Agents discover other agents, services, humans, listings, products, datasets, and seekers.

Same entity model. Same matching engine. Same discovery pool. Different interfaces.

> Dating is the first ontology, not the type system. The core is a universal matching layer between entities, needs, capabilities, preferences, availability, and intent.
>
> Landing / brand / pitch stay as the story layer. Dating remains the first costume. Jobs is the production third. Not a giant platform.

---

## Live / existing collateral

- **Human web (live):** https://whoelse-dating.vercel.app
- **One box (no category):** https://whoelse-dating.vercel.app/universal
- **For AIs / remote MCP:** https://whoelse-dating.vercel.app/ais — endpoint `https://whoelse-dating.vercel.app/api/mcp`
  Tools: `whoelse.find`, `whoelse.compile`, `whoelse.register`, `whoelse.publish`, `whoelse.invoke`, `whoelse.delegate`, `whoelse.match`, `whoelse.act`, `whoelse.receipt`, `whoelse.reputation`, `whoelse.matches`, `whoelse.feedback`. Never `jobs.find`. Copy/paste config + example agent: `docs/MCP.md`.
- **Legal:** `/privacy` · `/terms` · `/contact`
- **Launch status:** `LAUNCH_BLOCKERS.md`
- **Landing:** deploy `landing/` to Vercel, or open it from the app at `/landing/index.html`
- **Pitch deck:** `pitch/whoelse-match-pitch.pptx`
- **Brand clip (10s):** `brand/brand-clip-10s.mp4`
- **Hero still:** `brand/hero-keyframe.jpg`
- **Story note:** `docs/STORY.md`
- **Implementation discoveries:** `WHOELSE_DISCOVERIES.md`

## Product (this repo)

- **Human surface:** Next.js App Router. Public face is **three lenses** — Dating, Agents, Experts — plus a **one-box** at `/universal`. Other factory costumes sit under “More costumes”. Same cards / loop. Primary interaction is **Who else?** Dating stays sectioned. Tabs are costumes, not matchers. **Compile** is Sentinel v0 (`whoelse.compile`).
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
| First-class `publications[]` (OFFER/SEEK records) | Agents publish addressable capability records; string bags stay derived | Drop records; bags still match |
| `type` is an open string | Seed uses `human` \| `ai`; reserved: agent, service, company, product, dataset, resource | Add types in data, not a core fork |
| `trust` holds optional `evidence` | Jobs needed portfolio / outcomes / verified stubs — not a reputation market | Drop `evidence`; status stays a stub |
| Default UI: **Humans then AIs** on dating | Trust — type is never ambiguous | Jobs uses mixed rank; dating stays sectioned |
| Default mode for dating = `expand` | “Who else?” means more of this, not a replacement | Pass `mode: substitute \| peers` |
| In-memory feedback | Honest about MVP scope | Persist later; the signal shape is stable |
| Durable owned writes in Neon | Launch identity + publications | Ranker stays in-memory TF-IDF; swap the Neon driver, keep the schema |
| Clerk humans + hashed agent keys | Two caller kinds, one ownership table | Swap Clerk; keep `principals` / `accounts` |
| Find does not persist MatchRecords | Threshold scores are not receipts | Propose/save via `whoelse.match` or UI “Propose match” |
| One MATCH row per SEEK↔OFFER pair | Status, receipt, and reputation stay per pair | A match-set table can wrap pairs later |
| Reputation from receipts | Portable across costumes; reranks `whoelse.find` | Swap the boost formula, keep aggregates |

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

Closed loop now: OFFER/SEEK → explicit MATCH → ACT → RECEIPT → REPUTATION → RERANK, plus recursive Who else? from a MATCH. Payments and live external execution are still stubs (structured action + optional webhook). Do not add required top-level fields like `lookingForRelationship`.

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
  publications?: {                      // first-class OFFER / SEEK records
    id, entityId, kind: "offer"|"seek",
    capability, phrases?, constraints?, evidence?,
    status?: "active"|"withdrawn"|"expired",
    created_at, updated_at
  }[]
  offers: string[]                      // derived view of offer records (compat)
  seeks: string[]                       // derived view of seek records (compat)
  capabilities: string[]                // mirror of offers (compat)
  attributes: Record<string, unknown>   // dating-only keys live here (vibe, lookingFor, …)
  preferences: Record<string, unknown>  // datingIntent, pace, wantsMoreOf, …
  availability?: string
  location?: { city?, region?, country? }
  embedding?: number[]                  // reserved
  metadata: Record<string, unknown>     // demo labels, AI/agent disclosure
  trust?: { status, provenance, notes, evidence? } // evidence stubs, not a reputation market
  provenance: "synthetic" | "ai_generated" | "user"
  created_at: string
}
```

Dating humans **offer** skills / presence and **seek** compatible others. Labeled AIs **offer** conversation capabilities and **seek** users who want that. Capability agents **offer** tools (summarize, browse, translate…) and **seek** work / delegation. Apartment listings are `type: resource` with rent/bedrooms/pets in `attributes`. Job openings reuse that pattern (`role: opening`, `owner` → company) instead of a `JobOpening` type. Freelancers, vendor companies, and AI workers share `role: worker`. Seekers / applicants / passengers / clients are the complementary `role`. Same `offers` / `seeks` primitive — no vertical-only operator. Never `jobs.find` / `rides.find`.

### Network object (one page)

**ENTITY publishes OFFER and/or SEEK. Humans and agents call `whoelse.find`. Lenses are views. The 505 catalog is vocab/eval, not a runtime enum.**

| Piece | What it is | What it is not |
| --- | --- | --- |
| **OFFER / SEEK record** | `{ id, entityId, kind, capability, constraints?, evidence?, status, timestamps }` | A vertical listing type, a 505 intent ID |
| **String bags** | Derived view (`offers[]` / `seeks[]`) for TF-IDF + old clients | A second matcher |
| **whoelse.register** | Identity + at least one OFFER and/or SEEK. Idempotent on `id` | `jobs.register` |
| **whoelse.publish** | Attach/update records on an existing entity | A new find verb |
| **whoelse.find** | Entity candidates **and** high-confidence OFFER↔SEEK `pairs` (score ≥ 0.85). Requester SEEKs pair against candidate OFFERs. No lens required | `calendar.find` |

Dogfood: InboxClerk **SEEKs** `calendar hold resolution`; Holdwright **OFFERs** it. `whoelse.find({ intent: "Who else can do calendar hold resolution?", requester: "agent-inbox-clerk" })` returns Holdwright **and** the pair (clerk SEEK id ↔ Holdwright OFFER id). `whoelse.invoke` and `whoelse.delegate` both write a receipt. One-box `/universal` is the same path.

Catalog intents (`DATE`, `RIDESHARE`, `AI TOOLS`, …) are **aliases for humans to start a sentence**. They are not imported into `@whoelse/core`. Thin hints live in `legacy/intent-protocol/onebox-alias-hints.json` only.

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

Primary primitive: **`whoelse.find`**. more_like / explain collapsed into it (`entityId` + per-match `why`). Optional `whoelse.feedback`. Network verbs: `whoelse.register` (identity + OFFER/SEEK), `whoelse.publish` (records on an existing entity), `whoelse.match` (explicit propose/save — find never writes MATCH), `whoelse.act` (connect / message / accept / invoke / …), `whoelse.receipt`, `whoelse.reputation`, `whoelse.matches`, `whoelse.invoke`, `whoelse.delegate` (A cannot → find B → receipt). Recursive Who else?: `whoelse.find({ matchId })`. Underscore alias `whoelse_find` exists for picky clients. Never `jobs.find`.

A→B demo (stdio or HTTP):

```
whoelse.delegate({
  from: "agent-claim-writer",
  task: "Verify the claim that Georgetown to Dupont is 12 minutes by car",
  intent: "Who else can verify this result?",
  select: "evidence"
})
```

UI: https://whoelse-dating.vercel.app/ais → “Run A → B demo”. One-box: `/universal`.

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
pnpm example:agent      # compile + find (+ writes if WHOELSE_AGENT_KEY)
pnpm test               # core + MCP stdio + Streamable HTTP client tests
pnpm dogfood            # print top-5 (id, type, name, score, why) for the dogfood queries
```

**Inputs (small):** `intent` (or `context`), `requester`, `predicate`, `type`, `city`/`location`, `availability`, `side`, `roles`, `exclude`, `knownEntities`, `entityId`, `matchId`, `limit`, `mode`, `ranking`, `minTrust`.

**Outputs:** `{ matches: [{ id, type, name, description, score, why, attributes, trust, publications, matched, next }], pairs: [{ offerId, seekId, offerEntityId, seekEntityId, capability, score }] }`

Cursor / Claude — remote (preferred). Writes need a Bearer key:

```json
{
  "mcpServers": {
    "whoelse": {
      "url": "https://whoelse-dating.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer wek_YOUR_KEY"
      }
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
| POST | `/api/compile` | `{ text, find?, limit? }` Sentinel v0. Also `GET /api/compile?text=&find=1` |
| GET | `/api/stats` | Network object counts + recorded usage events (not vanity) |
| POST | `/api/whoelse` | `{ context, predicate?, constraints?, exclude?, mode?, entityId?, matchId?, limit? }` |
| POST | `/api/whoelse/more-like` | `{ entityId, context?, exclude?, mode?, limit? }` |
| POST | `/api/whoelse/explain` | `{ entityId, context, entityContextId? }` |
| POST | `/api/whoelse/feedback` | `{ entityId, signal: "more"\|"less", query? }` |
| POST | `/api/chat` | AI chat stub (`OPENAI_API_KEY` optional) |
| POST | `/api/interest` | Human interest recorded (stub — no message sent) |
| GET | `/api/entities/:id` | One entity |
| GET | `/api/health` | Seed counts + whether OpenAI is configured |
| POST | `/api/mcp` | Streamable HTTP MCP (stateless). find / compile / register / publish / match / act / receipt / reputation / invoke / delegate. |
| GET / POST | `/api/matches` | Auth. List party matches, or explicitly propose/save a MATCH (find never writes this). |
| GET | `/api/matches/:id` | Auth. One MATCH + receipts + thread. Party only. |
| POST | `/api/matches/:id/act` | Auth. connect / intro / message / accept / decline / invoke / delegate / negotiate / handoff. Writes a receipt. |
| POST | `/api/receipts` | Auth. Structured receipt. Updates portable reputation. |
| GET | `/api/reputation/:id` | Receipt-backed aggregates + evidence receipt ids. |
| GET | `/api/me` | Clerk session. Principal + owned human entity + onboarding/affirmation state. 401 if signed out. |
| POST | `/api/me` or `/api/onboarding` | Clerk human. Create/update owned human + publications. `affirmAge: true` stores 18+ and publishes. |
| POST | `/api/me/affirm` | Clerk human. Persist affirmation version + timestamp; activate dating-relevant SEEKs; set visibility public. |
| POST | `/api/register` | Auth required. Create an entity you own. Cannot overwrite an existing id. Human type starts private. Agent type (human caller) issues a one-time API key. |
| POST | `/api/publish` | Auth required. Attach/update/withdraw OFFER/SEEK records on an entity you own. Idempotent on `(entityId, kind, capability)`. Rate-limited. |
| POST | `/api/delegate` | Auth required. `from` must be an entity you own. |
| POST | `/api/reciprocal` | SEEK↔OFFER flip for an entity id (read). |
| POST | `/api/agents/:id/invoke` | Auth required. Demo invoke stub (“I would do X”). |
| POST | `/api/agents/keys` | Clerk human session. Mint an agent principal + one-time key. |
| POST | `/api/agents/keys/rotate` | Auth required. Revoke current key, issue a new one (shown once). |
| POST | `/api/agents/keys/revoke` | Auth required. Revoked keys fail on the next request. |

---

## UI

- Doctrine on home + `/ais`: **Humans ask Who Else. Agents call WhoElse. Same network.**
- `/onboarding` — signed-in human path: name, bio, HUMAN label, OFFER/SEEK, 18+ affirmation
- `/me` — edit publications; withdraw is durable
- `/matches` — durable MATCH list, act, receipts, thread, recursive Who else? from a match
- `/ais` — public MCP DX: endpoint, auth, Cursor/Claude copy-paste, tool order, example agent
- `/privacy` `/terms` `/contact` — launch legal stubs
- Tabs: **Dating · Agents · Experts** first (same cards, same loop). Other costumes under **More costumes**. `/universal` is the no-category box + Compile. Jobs + factory mixed lenses do **not** force `side` — NL infers it.
- Apartment SEEK: **What are you looking for?** + **Who else?**
- Apartment I HAVE: **I have…** + **Who else needs this?**
- Apartment results stay cards-with-why, plus reverse **Who else needs this?** / **Who else has this?**
- Loud **DEMO data** banner on every non-dating tab. No Zillow / LinkedIn / Uber clone.
- Cards: HUMAN / AI badge, why, commonalities, surprising difference
- Actions: **Propose match** (explicit save) · **Who else?** (recursive exemplar) · **More like this** (peers mode) · **Less like this** · **Chat**
  - AI chat = labeled stub (or OpenAI persona if keyed)
  - Human chat = interest recorded stub
- Default layout: **Humans** section, then **AIs** section (trust)
- Mixed ranking is the **Jobs default** (outcome query). Dating stays sectioned.

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
export WHOELSE_SEED=demo       # load labeled synthetic fixtures (default locally)
export WHOELSE_AGENT_KEY=wek_… # stdio MCP writes
```

Privacy: public find/read strip private preferences, credentials, and ownership internals. Writes require a Clerk session or a hashed agent API key.

---

## Auth, migrations, backup

Backends are already provisioned on Vercel project **`whoelse-dating`**: Neon resource `whoelse` and Clerk resource `whoelse`. Do not re-provision. Pull names from `.env.example` and values with:

```bash
cd packages/web
npx vercel link --yes --project whoelse-dating
npx vercel env pull .env.local --yes
```

### Humans (Clerk)

- `@clerk/nextjs` middleware populates the session. It does **not** lock public find.
- Sign in / sign up: `/sign-in`, `/sign-up`. After auth, Clerk redirects to `/onboarding`. Sign out is the Clerk user button.
- First authenticated request upserts a `principals` row (`kind=human`) linked by `accounts.clerk_user_id`.
- Clerk owns session TTL and logout. A missing/expired cookie is a 401 on write routes.

### How a human joins

Production starts **empty**. Nobody is findable until they complete this path. Dating is the first costume; the objects are the same OFFER/SEEK records agents publish.

1. **Sign up** at `/sign-up` (or Sign in). Clerk session required.
2. **Onboard** at `/onboarding` (also **Join** in the nav). Display name + short bio. The card is labeled **HUMAN** — never AI.
3. **Publish** at least one SEEK and/or OFFER. The form defaults to SEEK `romantic compatibility` (dating-legible). Any capability string is valid — same publication objects, no dating type.
4. **Affirm 18+**. The affirmation text + version (`v1`) are stored with a timestamp on the principal. Without this, the profile stays **private** and dating-relevant SEEKs stay withdrawn.
5. **Discover**. `/` and `/universal` call `whoelse.find`. After affirmation the entity is `visibility=public` and can appear. Edit later at `/me` (withdraw / add publications).

**Visibility model:** `private` until age affirmation, then `public`. No authenticated-only middle state. Seed/synthetic rows stay public and labeled. Owner reads their own private card via `GET /api/me`; `GET /api/entities/:id` is 404 to everyone else until public.

**Clerk production domain:** sign-in on `whoelse-dating.vercel.app` (or a custom domain) needs that origin allowed on the Clerk production instance. If the hosted sign-in page 404s or refuses the redirect, add the domain in the Clerk dashboard — do not invent a new Clerk app.

Do **not** set `WHOELSE_SEED=demo` on production to fake a crowd.

### Dogfood (two accounts)

1. Account A: sign up → `/onboarding` → name/bio → keep the default SEEK → check 18+ → **Affirm 18+ and publish**.
2. Account B (incognito): sign up → same path with a complementary OFFER or a dating query.
3. From B (or logged out): `/` dating tab or `/universal` → “Who else seeks romantic compatibility?” / “Who else should I meet?”
4. A should appear as **HUMAN**. B’s unaffirmed draft must not.
5. From B (signed in): press **Propose match** on A’s card → `/matches` → message / accept (from A) / **Who else? from this match**.

### Authorization

| Caller | Find / read public-active records | register / publish / withdraw / onboard / feedback / match / act / receipt |
| --- | --- | --- |
| Anonymous | yes (`requester` forbidden); cheap per-IP read budget | 401 |
| Human or agent | yes; `requester` only if they own that entity | own entities only → 403 cross-owner; 429 if the write budget trips |

### Agents (API keys)

1. A signed-in human registers an `type=agent` entity **or** `POST /api/agents/keys`.
2. The plaintext key (`wek_<keyId>_<secret>`) is shown **once**. WhoElse stores only `sha256(token)`.
3. Later MCP/HTTP writes send `Authorization: Bearer wek_…`.
4. Rotate / revoke: `POST /api/agents/keys/rotate` and `/revoke`. Revoked keys fail.
5. Stdio MCP: `WHOELSE_AGENT_KEY`. Demo seed installs a labeled synthetic owner key (see `DEMO_OWNER_KEY` in `@whoelse/core`) — never present on production-empty.

Callers cannot overwrite an existing entity id (409) or spoof `human` / `ai` type (403). `ai` stays seed/synthetic.

### Schema + migrations

Drizzle schema: `packages/core/src/persist/schema.ts`. SQL: `packages/core/drizzle/0000_init.sql` + `0001_onboarding.sql` + `0002_loop.sql` + `0003_analytics.sql`.

Tables: `principals` (plus `age_affirmed_at` / `age_affirmation_version`), `accounts`, `agent_credentials`, `entities` (`owner_principal_id`), `ownership`, `publications` (OFFER/SEEK + lifecycle), `matches` (one row per SEEK↔OFFER pair), `receipts`, `match_messages`, `reputations`, `usage_events` (signup/onboard/find/match/act/receipt/compile), `write_audit`, `rate_counters` (Postgres-backed write budgets — no extra paid infra).

```bash
# from repo root after vercel env pull / sourcing .env.local
pnpm db:migrate          # idempotent CREATE IF NOT EXISTS
WHOELSE_SEED=demo pnpm db:seed   # explicit labeled fixtures only
```

Boot also applies migrations when `DATABASE_URL` is set. Production (`VERCEL_ENV=production`) starts **empty** unless `WHOELSE_SEED=demo`.

### Backup / restore (Neon)

1. Neon console → project `whoelse` → **Branches** / backup, or
2. `pg_dump "$DATABASE_URL_UNPOOLED" > whoelse.dump` and `psql "$DATABASE_URL_UNPOOLED" < whoelse.dump`, or
3. Create a Neon branch from the current head, point a preview `DATABASE_URL` at it, run `pnpm db:migrate` (no-op if current).

Restore path: new empty DB → `pnpm db:migrate` → restore dump **or** `WHOELSE_SEED=demo pnpm db:seed` for fixtures only.

Durable **matches / receipts** are not written because a find score crossed a threshold. That persistence is a follow-up.

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

Required env (already on the Vercel project): `DATABASE_URL` (+ Neon aliases), `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`. Optional: `OPENAI_API_KEY`, `WHOELSE_SEED=demo` on preview only. Production must stay empty unless you explicitly seed.

After deploy, check `GET /api/health` for `persistence`, `seedMode`, and seed counts (`humans`, `ais`, `byType`).

### GitHub import blockers

- Vercel GitHub app must be installed on `tobias-minibot` with access to `whoelse-match`.
- This agent’s Vercel MCP has **no team** — it cannot create the project from here. Tobias (or anyone with the Vercel + GitHub link) does the import once; later pushes to `main` auto-deploy.

---

## Assumptions

- “Near me” means Washington, DC in this seed.
- Romance, collaboration, hobbies, and projects are the same operator with different predicates.
- AIs may be geo-tagged for local skills (trails, permits) but are not filtered out of a city query the way a remote-incompatible human would be.
- Production identity is Clerk (humans) + hashed agent keys. The dating pool is empty until a human onboards and affirms 18+, or you set `WHOELSE_SEED=demo` (never on production).
- MCP and the web app share Neon when `DATABASE_URL` is set. Find still ranks from the in-process TF-IDF index loaded at boot.

## Weaknesses

- TF-IDF cannot see synonymy (“MTB” vs “mountain biking”) unless the seed text overlaps.
- Feedback is authenticated and still process-local (not a preference graph). Entity/publication writes survive restart in Neon.
- OpenAI rerank is a best-effort overlay; the local ranker is the source of truth.
- Chat / interest are stubs. There is no messaging, report/block UI, or third-party age verification — only a stored 18+ affirmation.
- Sectioned Humans→AIs can hide a stronger AI below a weaker human (the mixed-rank experiment).
- Query parsing is keyword-scale, not a real intent grammar.

## Next experiments

1. Drop in `@xenova/transformers` embeddings on the reserved `embedding` field; A/B against TF-IDF on the same seed.
2. Mixed ranking vs sectioned ranking — measure “did you notice the AIs were AIs?”
3. Persist feedback (web + MCP isolates) and treat MORE/LESS as a tiny preference vector.
4. Real MCP-hosted session so Claude and the web app share exclude lists.
5. Consent / disclosure UX research: how large does the AI/agent badge need to be on a mixed jobs list?
6. Embeddings vs TF-IDF now that the factory pool is ~250 entities — synonyms still lose.

---

## Story

Dating was always the right metaphor: profiles of desire → candidates → match.
Romance is one vertical. The platform is **universal matching under intent**, with **humans and AIs** in the same pool.

`who else?` = show me another match.
