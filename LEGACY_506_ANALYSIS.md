# Legacy 506 “INTENT who else?” vs live WhoElse

Evidence + test-suite reading of the old Universal Namespace taxonomy against the live engine at [whoelse-dating.vercel.app](https://whoelse-dating.vercel.app). **Production was not redesigned.** Historical sources were copied, not edited.

**Doctrine under test:** Humans ask Who Else. Agents call WhoElse. Same network.  
**New primitive:** `whoelse.find` — find additional entities satisfying an intent.

**Extraordinary claim:** 506 intents collapse to one operation.  
**Verdict:** **True at the operator layer. False as a fulfillment story.** Every recovered / reconstructed legacy intent is the same verb (`FIND`). The nouns were costumes. The live seed only pays off a handful of those nouns. That is a catalog-of-entities problem, not a need for `findDentist`.

---

## 0. Artifact hunt (read this before any count)

Canonical machine files were **not recovered** on this GitHub token:

| Artifact | Status |
| --- | --- |
| `intent-slots-506.csv` | missing |
| `intent-protocol.json` | missing |
| July 18 2026 snapshot (506, DATING present) | claimed, file missing |
| August 15 2026 snapshot (505, DATING ⊂ DATE) | claimed, file missing |
| MCP4MCP imported taxonomy | repo 404 |
| Protocol v2 (452 + 54 aliases + 36 slots) | claimed, file missing |

Reachable public evidence: `WhoElseExpressions`, `who-else-startups`, `whoelse-meaning-app`, this repo’s landing encodings, whoelse.ai (200-intent claim), DIN SPEC 2343 parameters.

Named archaeology repos (`whoelse`, `who-else-engine`, `who-else-index`, `who-else-analyzer`, `whoelse-search`, `whoelse-collateral`, `whoelse-xprize`, `4mcp`, `knowledge-compendium`, `whoelse-live-search`, `whoelse-translator`, `whoelse-autonomous-org`, `intent-namespace*`) are **404** for the `cursor` token on `tobias-minibot`. Private list empty. Copies + hashes: [`legacy/artifacts/MANIFEST.md`](legacy/artifacts/MANIFEST.md).

**Reconstructed snapshot** (labeled, not silently substituted for 506):

- File: [`legacy/artifacts/reconstructed-2026-09-12/surviving-catalog.json`](legacy/artifacts/reconstructed-2026-09-12/surviving-catalog.json)
- **PROVENANCE: "user-pasted surviving catalog 2026-09-12"**
- 250 intents: 7 named + 17 public-evidenced + 204 category expansions + 22 AI/agent misses
- Mapping: [`legacy-intent-mapping.json`](legacy-intent-mapping.json)

### Version ledger — do not reconcile

| Version | Claimed shape | What we can prove |
| --- | --- | --- |
| Public 2018–2022 | **150** (Medium) / **200** (whoelse.ai) | Marketing counts. Examples: Apartment / Delivery / Date / ride-share / Restaurant / Digital Lawyer / Tax Filings |
| July 18 2026 | **506 IDs**, DATING distinct from DATE | Count + DATING fork only. No CSV |
| August 15 2026 | **505 IDs**, DATING folded into DATE | Fold is the only attested delta |
| Protocol v2 | **452** canonical concepts, **506** IDs, **54** permanent aliases, **36** global slot roles | Arithmetic *if true*: 452+54=506. That 506 is **not** the same object as August’s 505 |

If someone later drops the real CSV in, replace the reconstructed file. Do not “fix” these counts to match each other.

---

## 1. Can `whoelse.find` express each legacy intent?

**Schema: yes.** All 250 reconstructed rows map to one call:

```
whoelse.find({
  intent: "<human sentence>",   // or context
  type?: "human" | "ai" | "agent" | "service" | "resource" | …,
  city?: string,
  availability?: string,
  entityId?: string,            // exemplar
  mode?: "expand" | "peers" | "substitute",
  predicate?: string,
  exclude?: string[],
  limit?: number
})
```

There is no `findDentist`. `DENTIST who else?` is:

```
whoelse.find({ intent: "Who else is a dentist near me who is available this week?", type: "service" })
```

Same for `DATE`, `PLUMBER`, `PDF_SUMMARIZER`. The legacy ID is a **noun in a sentence**, not a tool.

**Lab (seed): only sometimes.** Production is a dating-first pool plus a few capability agents and two thin stubs (apartment, ride). So:

| Kind | Schema | Typical live seed |
| --- | --- | --- |
| DATE / DATING / CYCLING / collaborator | expressible | **SEEDED_HIT** (humans + Plan-a-Date / trail bots) |
| APARTMENT / RIDESHARE | expressible | **SEEDED_HIT** on the stubs if the sentence says apartment / ride |
| PDF / browse / translate / verify / failover / delegate | expressible | **SEEDED_HIT** on `type: agent` rows |
| DENTIST / PLUMBER / NOTARY / LAWYER / GIFT / JOB | expressible | **EXPRESSIBLE_UNSEEDED** — HTTP 200, off-topic or weakly lexical matches |
| Book / pay / call the dentist | not find | Adjacent `FULFILL` (invoke/chat stubs). Not WhoElse |

Live numbers: [`legacy/live-probe-results.json`](legacy/live-probe-results.json) (filled by `scripts/legacy-live-probe.ts`).  
**Pass rate to report = schema expressibility** (the question asked). Seed hit-rate is a laboratory measurement of the *entity catalog*, not of the operator.

---

## 2. What are the real primitives?

From the live core (`packages/core`), not from the old catalog:

```
WHOELSE(context, predicate?, constraints?, exclude?, mode?) → candidates
mode: expand | peers | substitute
```

Machine name: **`whoelse.find`**. Human name: **“Who else?”**

Entity fields that actually do work:

| Field | Role |
| --- | --- |
| `id`, `type`, `name`, `description` | identity |
| `offers` / `seeks` | capability ↔ need |
| `attributes` / `preferences` | domain costume (dating keys live here) |
| `location`, `availability` | soft constraints |
| `entityId` | exemplar / anchor |
| `exclude` / `knownEntities` / `requester` | “not these” |
| `trust` | stub |

That is the whole operator. Romance, plumbing, and PDF summary are **the same function** with different `context` and a different row in the pool.

Adjacent primitives that the old taxonomy *implied* but the live engine **correctly does not implement**:

- **FULFILL** — book, pay, call, invoke (`POST /api/agents/:id/invoke` is a demo stub)
- **PUBLISH** — register an entity in the namespace (seed file, not a protocol)
- **WITNESS GRAPH** — structured contradictions (pitch only)

Those are not reasons to resurrect 506 endpoints. They are later verbs, if ever.

---

## 3. Cluster by semantic OPERATION (smallest set)

Life categories (Body & Health → Shopping & Gifts) are **costumes**. Clustering by verb:

| Family | What it asks | Live encoding | Share of reconstructed catalog |
| --- | --- | --- | --- |
| **FIND** | Additional entities that satisfy this intent | `whoelse.find({ intent })` | ~all 250 |
| **ANCHOR** | Relative to an exemplar (more like / instead of / peers) | same tool + `entityId` + `mode` | a mode, not a second operator |
| **FULFILL** | Do the thing with a chosen entity | not find | 0 catalog rows; implied by “book the 5:30” |

Smallest set that explains both worlds: **one operation (FIND), one optional anchor, three modes.**

The 506 nouns (dentist, plumber, date, apartment, …) are **values of the intent**, not families.

If you insist on a slightly larger set for product language:

1. Find fulfillers (who can *do* X) — dentist, plumber, summarizer  
2. Find peers (who also *wants* X) — date, cycling buddy, cofounder  
3. Find resources (which *thing* is X) — apartment, gift, ride  

Those three are still one operator. `offers` vs `seeks` vs `type` already distinguish them. Do not promote them to endpoints.

**Proof sketch (operator collapse):**

- Every recovered human phrase is `NOUN who else?` or `Who else can/wants/has NOUN?`
- Live `queryText()` concatenates context + predicate + optional exemplar text
- Ranker is TF-IDF + offers↔seeks + geo + type + feedback
- No branch on intent ID exists in `packages/core`

**Disproof that would have mattered (and did not appear):**

- A legacy intent that cannot be stated as “find entities satisfying …”
- A required second tool to *discover* (explain/more_like were already folded into find)
- A need for per-noun schemas to get a well-formed call

Booking a chair is a different verb. It was never WhoElse. The old catalog smuggled fulfillment into the noun.

---

## 4. Old 36 slot roles vs `whoelse.find` schema

The 36-role list was **not recovered**. We reconstructed 36 roles from DIN transfer fields + meaning-app examples + landing encodings (`legacy/artifacts/reconstructed-2026-09-12/surviving-catalog.json` → `reconstructed_slot_roles_36`). Treat them as a hypothesis to score, not as Protocol v2 gospel.

Live find fields: `intent|context`, `requester`, `predicate`, `type`, `city|location`, `availability`, `exclude`, `knownEntities`, `entityId`, `limit`, `mode`, `ranking`, `minTrust`.

| Slot (reconstructed) | Verdict | Why |
| --- | --- | --- |
| LOCATION / city | **KEEP** | `city` / `location` |
| AVAILABILITY | **KEEP** | `availability` |
| PROVIDER_TYPE | **KEEP** | `type` (open string) |
| REQUESTER | **KEEP** | `requester` |
| EXEMPLAR | **KEEP** | `entityId` + `mode` |
| SKILL / OBJECT / ACTIVITY / VIBE / PREFERENCE / CONSTRAINT | **DERIVE** | ride in `intent` / `predicate` |
| TIME / DATE / DURATION / URGENCY / PARTY_SIZE / RADIUS | **DERIVE** | no structured field; sentence is enough for FIND |
| BUDGET / PRICE / PAYMENT | **DOMAIN-SPECIFIC** | needed for quotes (PriceMCP/QuoteCall), not for find |
| INSURANCE / CERTIFICATION | **DOMAIN-SPECIFIC** | dentist / notary costumes |
| LANGUAGE | **DERIVE** now; maybe KEEP later | “German to English” works as text; a `locale` filter would be cheap |
| ORIGIN / DESTINATION | **DOMAIN-SPECIFIC** | rideshare |
| RECIPIENT / QUANTITY / CONDITION / BRAND / METHOD | **DERIVE** or **DOMAIN-SPECIFIC** | gift / shopping |
| CONTACT | **OBSOLETE** for find | next-step stubs (chat / invoke / interest) |
| CONFIDENCE | **REDUNDANT** | ranker `score`, not a slot |
| LOCALE | **MISSING** as a first-class field | DIN had it; find does not |
| SOURCE (witness) | **MISSING** as structure | pitch-level; verifier agent is the seed stand-in |
| Biometric / SpeechToText / LinkToAudio (DIN) | **OBSOLETE** | privacy-by-design said not to ship audio; live product is text |

**Rule of thumb:** if a slot changes *who is a candidate*, it may deserve a constraint later. If it only changes *which sentence you type*, keep it in `intent`. Do not rebuild 36 required keys.

---

## 5. Alias analysis — stable IDs?

Without the CSV we cannot prove SHA-stable IDs. What the version *claims* imply:

| Claim | Implication |
| --- | --- |
| 452 canonical + 54 permanent aliases = 506 IDs | IDs were meant to be stable; aliases were first-class, not typos |
| August 15: DATING folded into DATE | **IDs were not perfectly stable.** A canonical ID was retired |
| Landing encodings (`DATE who else?`, `VOICE NETWORK who else?`, `MOUNTAIN BIKING who else?`) | Human phrases were the real key; IDs were filing labels |
| Live aliases | `whoelse_find` ↔ `whoelse.find`; `context` ↔ `intent`; `capabilities` ↔ `offers` |

**Recommendation:** do **not** mint a new 452-ID registry. If the CSV returns, import it as an **eval fixture** (`legacy_id → example sentence`). If two nouns are aliases (DATE/DATING, RIDE/RIDESHARE, LAWYER/ATTORNEY), one sentence plus optional `predicate` is enough.

DATE vs DATING is the only attested fold. Treat them as:

- July 18: two IDs  
- August 15: DATE canonical, DATING alias  
- Live: one sentence family (“Who else should I date?” / “Who else wants a low-key dinner…”)

Do not pick a winner in production code. The engine never saw either ID.

---

## 6. What the old taxonomy missed (506+x)

The surviving spine is a **human life-services yellow pages**: body, home, food, transport, work, legal, money, school, dating, family, pets, sport, events, shopping.

It systematically under-specified the **agent economy** the doctrine now requires:

| Missed class | Why it matters | Live stand-in |
| --- | --- | --- |
| Capability agents (summarize, browse, translate, verify) | Agents are entities, not just API clients | 9 seeded agents |
| Failover / delegate / cheap runner | “Who else can take over?” | Understudy, Hand-off, ThriftWorker |
| Capability index | Who knows who can do this | CapIndex |
| Voice routing / handoff across assistants | Original whoelse.ai story | Open Voice Router, Handoff Concierge |
| Witness / contradiction | Universal Namespace pitch | Checkmate + protocol pitch, not a graph |
| MCP server as a findable entity | 2026 machine surface | `/api/mcp` advertised on agents |
| Price / quote layer | Adjacent Tobias repos (PriceMCP, QuoteCall) | none in seed |
| Evaluator / moderator / scheduler / RAG index | Agent-native work | none |
| Mixed Human/AI/Service matrix as data | Doctrine | `type` is an open string — schema ready, catalog thin |

**506+x** is not “add 80 more life nouns.” It is “the noun list was the wrong axis.” The missing axis is **entity type × offers**, not another medical specialty.

---

## 7. Taxonomy vs training wheels — recommend A–E (what to build NOW)

Defined so the letter is falsifiable:

| Option | Meaning | Build now? |
| --- | --- | --- |
| **A** | Restore 452/506 IDs as the production contract (enum / registry UI) | No |
| **B** | Catalog as routing table (`findDentist`, per-noun handlers) | No — forbidden by the brief and by the engine |
| **C** | One operator, no catalog at runtime | **Yes, this is already live** |
| **D** | Catalog as training wheels / eval suite only | **Yes, this PR** |
| **E** | General relation operator over arbitrary entities | Interpretive frame; do not implement a second product |

**Recommendation: hybrid C + D, with E as the reading (not a rewrite).**

- **Runtime (C):** keep `whoelse.find`. Humans type English. Agents call the same tool. No intent enum in `@whoelse/core`.
- **Evidence (D):** keep the reconstructed (and someday real) 506 list as a **probe suite**. That is what `scripts/legacy-live-probe.ts` is for.
- **Reading (E):** WhoElse is `FIND` under a relation *satisfies-intent* / *similar-to-exemplar*. A future `RELATED(a, b, predicate)` can wait until a second vertical forces it.

Why not A: the August DATING fold already shows the registry tax. 150 vs 200 vs 452 vs 505 vs 506 shows the registry never settled. Live dating quality came from **seed craft**, not from IDs (`WHOELSE_DISCOVERIES.md`).

Why not B: hard-coded endpoints re-create the skill-store problem whoelse.ai was founded to escape (“Hey Alexa, open MyTaxi”).

---

## 8. Live probe (≥50) and scale across the taxonomy

Script: [`scripts/legacy-live-probe.ts`](scripts/legacy-live-probe.ts)  
Results: [`legacy/live-probe-results.json`](legacy/live-probe-results.json)

Method:

1. Take every **named** + **public** + **missed** intent, plus 3 per life category (≥50).
2. `POST /api/whoelse` on production with the mapped human sentence.
3. Score **schema pass** (HTTP 2xx, call well-formed) vs **seed pass** (lexical overlap with a returned entity).
4. One MCP `whoelse.find` sample on the same host.

Scale: `legacy-intent-mapping.json` marks **250/250** as `EXPRESSIBLE_AS_FIND` at schema level. The probe does not need 250 HTTP calls to establish that; it needs a representative lab slice plus the mapping for the rest.

Interpretation rules:

- Empty or off-topic dentist results **do not** mean “cannot express dentist.”
- They mean “no dentist entity is in the pool.”
- That is the same lesson as first-five dogfood: quality is seed, not a new operator.

---

## 9. No hard-coded `findDentist` endpoints

Confirmed in live code:

- One HTTP matcher: `POST /api/whoelse`
- One MCP tool: `whoelse.find` (+ underscore alias + optional `whoelse.feedback`)
- `packages/core` has zero per-noun branches
- Dating keys stay in `attributes` / `preferences`
- `type` is an open string

The archaeology must not introduce `findPlumber`. This PR doesn’t.

---

## 10. Preserve human language

Old surface: `Date who else?` / `Apartment who else?` / `Delivery who else?`  
New surface: `Who else should I date?` / `Who else has an apartment?`

Same grammar (WHO + expansion). The live UI asks a question; it does not ask for an ID.

Landing still *displays* encodings (`DATE who else?`, `VOICE NETWORK who else?`) as story. The engine does not parse those tokens as a registry. **Keep the sentence. Do not require the token.**

WhoElseExpressions (190+ language fragments) is evidence that the *question* is the primitive, not the English noun list. A 506-English-ID catalog was always a filing cabinet for one language.

---

## 11. Human / AI / Service network matrix

Live reserved types: `human | ai | agent | service | company | product | dataset | resource`.

Legacy catalog assumed **human service providers** (dentist, plumber, notary) with the AI layer as a *router between NLPs* (whoelse.ai 2018–2020). The 2026 doctrine puts **all of them in one pool**.

| Intent family | Human | AI | Agent | Service / resource |
| --- | --- | --- | --- | --- |
| DATE / peer | primary | Plan-a-Date, Nova | — | — |
| DENTIST / trade | licensed person | triage / insurance explainer | scheduler | clinic as `service` |
| APARTMENT | roommate / realtor | Deal Radar | — | listing as `resource` |
| RIDESHARE | driver | routing bot | — | ride as `service` |
| PDF summarize | — | labeled AI | capability agent | — |
| WITNESS | expert | — | verifier | — |

`whoelse.find` already returns mixed types. The dating UI sections Humans then AIs for trust. That is a **client costume**, not a second matcher.

What the old taxonomy missed: an AI is not only the *channel* (Watson vs Mindmeld). An AI is a **candidate**. Once that is true, 506 life nouns are optional labels on `offers`.

---

## 12. Bigger interpretation — relations between arbitrary entities?

Yes, but do not build it now.

`whoelse.find` is a special case of:

```
FIND( anchor?, relation, constraints ) → { entities }
```

where the default relation is *satisfies this intent* and the optional anchor relation is *similar / peer / substitute*.

Universal Namespace pitches (who-else-startups #8) wanted a richer relation set: alternatives, contradictions, witnesses, uncertainty zones. That is a **graph of relations**, not 506 intents.

Two readings, ranked:

1. **Build now (this repo):** one relation, `satisfies-intent`, plus exemplar modes. Dating works. Agents work. Legacy nouns work as sentences.
2. **Later, if a second vertical forces it:** typed relations (`can-fulfill`, `contradicts`, `cheaper-than`, `failover-for`) as *data on entities*, still queried through find (`predicate` / `offers` / `seeks`), not through new HTTP verbs.

506 → 1 is extraordinary and, on the evidence we have, **true for discovery**. The next collapse, if any, is “relations → a few predicates on the same find,” not “intents → endpoints.”

---

## Architecture to ship (and not ship)

**Ship (already shipped in production; this PR only documents):**

- One operator: `WHOELSE` / `whoelse.find`
- Human sentence in, ranked entities out
- Open `type`, `offers`/`seeks`, optional exemplar
- Legacy catalog as **eval + evidence** (this tree)

**Do not ship:**

- A 506 enum in core
- Per-noun routes
- A new registry UI
- Reconciling 506/505/452 into one “official” number
- Editing historical repos

**If the real CSV appears:** copy it under `legacy/artifacts/<source-repo>/` with a new MANIFEST line. Re-run the probe. Do not “clean” DATING away.

---

## Report card (for the PR summary)

| Question | Answer |
| --- | --- |
| Artifact locations | `legacy/artifacts/` + MANIFEST; reconstructed snapshot `legacy/artifacts/reconstructed-2026-09-12/`; mapping `legacy-intent-mapping.json` |
| Recommended architecture | **Hybrid C + D** (one operator now; taxonomy as test suite). E is the reading, not a rewrite. |
| Operation families | **1** live (`FIND`) + modes. **3** if you name fulfiller / peer / resource as costumes. **Not 506.** |
| Schema expressibility | **250 / 250** reconstructed intents |
| Live probe | see `legacy/live-probe-results.json` after `npx tsx scripts/legacy-live-probe.ts` |
