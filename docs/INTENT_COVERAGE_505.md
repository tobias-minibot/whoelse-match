# 505-intent coverage vs the generic WhoElse core

**Question Tobias asked:** the UI shows three lenses. How many of the 505 historical intents are **already representable by the generic core** — not merely visible in the UI?

**Answer (re-run with `pnpm coverage:505`):**

| Class | Count | / 505 |
| --- | ---: | ---: |
| **A — fully covered** | **371** | 73.5% |
| **B — covered with normalization** | **31** | 6.1% |
| **C — needs one reusable extension** | **38** | 7.5% |
| **D — not yet representable** | **6** | 1.2% |
| **E — bad / duplicate / obsolete** | **59** | 11.7% |
| **Effective coverage = A+B** | **402** | **79.6%** |

```
UI lenses = Dating / Agents / Experts = 3
Semantic coverage = A+B / 505 = 402 / 505 = 79.6%
```

Those are different numbers on purpose. Lenses are costumes over one `whoelse.find`. Coverage is whether a useful request compiles to **ENTITY + OFFER/SEEK + CONSTRAINT + MATCH** without a new matching primitive.

Machine artifacts: [`evals/intent-coverage/intents.json`](../evals/intent-coverage/intents.json), [`evals/intent-coverage/summary.json`](../evals/intent-coverage/summary.json). Human index: [`/universe`](../packages/web/src/app/universe/page.tsx).

---

## 1. Denominator (do not reconcile)

| Claim | This audit uses |
| --- | --- |
| Cabinet | [`legacy/intent-protocol/intent-protocol.production-v0.3.compact.json`](../legacy/intent-protocol/intent-protocol.production-v0.3.compact.json) (PR #10) |
| IDs | **505** = `i001–i325`, `i327–i506` (skip **`i326`**, DATE fold hole) |
| Attested | **172** (n=1–170 + `i308-date` + `i400-ai-tools`) |
| Reconstructed-to-fill | **333** (22 subgroup counts + PR #5 names) |
| Unique labels | **452** |
| Extra duplicate-label rows | **53** (52 labels; `JOB` appears 3×) |

**Same 505 set for every A/B/C/D/E count.** Fill rows are eval fixtures, not SHA-stable production keys. This is **not** the July 506 DATING-split snapshot and **not** protocol-v2’s 452+54 arithmetic.

Prior work this does **not** reopen:

- PR #5: every recovered noun is the verb `FIND` (operator claim). Live seed hit-rate is a catalog problem.
- PR #10 grammar review: 505 nouns are a filing cabinet. Do not ship them as a runtime enum.

This audit asks a stricter question than “can `whoelse.find({ intent })` accept the sentence?” That answer is still 505/505. Sentinel `compileLanguage("Who else is a {noun}?")` also returns `WHOELSE_COMPILABLE` for all 505 canonical forms. **Representable ≠ seeded ≠ shown as a lens.**

---

## 2. What “the generic core” is (PR #17)

Production (https://whoelse-dating.vercel.app) after `#17`:

```
ENTITY (open type)
  + first-class OFFER / SEEK publications
  + CONSTRAINT { key, op, value }
  + MATCH (explicit propose; find is side-effect free)
```

Machine path: `whoelse.find` / `whoelse.compile` (`POST /api/compile`). Human path: one-box + three primary lenses (Dating, Agents, Experts). Other factory lenses still exist behind “more” — they are views, not matchers.

**Already first-class constraint families:** city / region / neighborhood, price|budget|rent|rate, bedrooms / pets / furnished, origin / destination / seats, licensed, urgency, state, inStock, openNow, deliverToday, availableFrom / when, evidence kinds (license, verified, portfolio, outcome, reference, receipt), side + roles.

**Already adjacent, not find:** ACTION (`invoke` / `delegate` / `connect` / …). Booking, paying, and filing are not WhoElse.

**Missing reusable concepts (C only when the *useful* request needs them):** eligibility, reservation / bookable inventory, remaining capacity, geo radius (today “near me” hard-defaults to Washington, DC).

---

## 3. Method

1. Load all 505 rows from the compact cabinet. Reject if count ≠ 505 or `i326` is present.
2. For each row, map a canonical SEEK/OFFER IR stub (capability = noun, side, optional geo/price/availability).
3. Classify **statically** against `packages/core` (schema, `parse.ts` heuristics, `compile.ts` Sentinel, known roles/lenses). Rules live in [`evals/intent-coverage/classify.ts`](../evals/intent-coverage/classify.ts) — the counts are not hand-waved.
4. Run local `compileLanguage` on each canonical query (heuristics only; no OpenAI required).
5. Optionally sample production `POST /api/compile` (`pnpm coverage:505:probe`) — polite batch, no writes, not required for the numbers.

Classification order: **E → D → C → B → A**.

| Class | Rule |
| --- | --- |
| **E** | `alias_of` set (52 rows) **or** SKU-as-intent overgeneration (WATER, TEA, BEER, COFFEE, WINE, SNACK, COCKTAIL). Deprecate. Do not invent architecture to keep the ID. |
| **D** | The useful request is not find(compatible entities): content, abstract category, enforcement process, genealogy, bulletin, lost-item inventory. |
| **C** | Same `whoelse.find`; the *primary useful* request needs one missing reusable primitive (not a vertical engine). |
| **B** | Generic engine works after alias / leaked-slot remap / Sentinel / DATE-family normalization. No new primitive. |
| **A** | Noun-find is already a useful request on ENTITY + OFFER/SEEK + existing constraints + MATCH. Specialty, vibe, reason ride in the sentence. |

Mechanical wrap of `{LABEL} who else?` → `Who else is a {label}?` is **not** enough to force B. That wrap is Sentinel’s job for every noun. B is only non-trivial remapping.

---

## 4. Exact counts

```
A / 505 = 371 / 505
B / 505 =  31 / 505
C / 505 =  38 / 505
D / 505 =   6 / 505
E / 505 =  59 / 505
A+B / 505 = 402 / 505 = 79.6%
```

371+31+38+6+59 = 505.

Attested vs fill does not change the denominator. Deep rows (`DOCTOR`, `RESTAURANT`, `DATE`, `AIRBNB`, `LAWYER`): A, C (restaurant + Airbnb reservation), A, C, A.

---

## 5. Top C extensions (by leverage)

Add **one reusable concept**, not a restaurant engine / bank engine / airline engine.

| Rank | Extension | Intents unlocked | What to add (generic) | Examples |
| ---: | --- | ---: | --- | --- |
| 1 | **eligibility** | **18** | Constraint family `{ key: "eligible", op, value }` / evidence of qualification (income, credit, membership, status). Same find. | BANK, LOAN, FINANCE MORTGAGE, INSURANCE, SCHOLARSHIP, SOCIAL HOUSING, LEGAL AID, ADOPTION, PET INSURANCE |
| 2 | **reservation** | **16** | Bookable unit at time T (remaining capacity + hold). ACTION `book` may follow; the *match* needs inventory-at-time. | RESTAURANT, HOTEL, AIRBNB, FLIGHT, CONCERT, TICKET, CAR RENTAL, ROOM BOOKING |
| 3 | **geo-radius** | **3** | Distance / ETA, not city equality. “Near me” must not mean “Washington”. | AMBULANCE, FOOD DELIVERY, BIKE MESSENGER |
| 4 | **inventory** | **1** | Remaining count (not boolean `inStock`). | PARKING |

`licensed`, `availability` (phrase), and `inStock` (boolean) already exist. Doctor / plumber / pharmacy stay **A**: “who else is a cardiologist near me this week?” is useful without insurance-network matching or a calendar grid. Those refinements can wait.

Two-market `MORTGAGE`: HOME `i092` is **B** (housing shirt on a finance product). FINANCE `i161` is **C** (eligibility). Do not merge them into one ID.

---

## 6. Top E deprecations (duplicates / obsolete)

59 rows. Do not seed them. Do not give them routes.

**Named aliases (7)** — keep the canonical ID’s sentence:

| Deprecate | Canonical |
| --- | --- |
| `i196-volunteer` labeled **JOB** | `i177-job` (volunteer as a concept is lost — catalog bug, not a new primitive) |
| `i208-cooking-class` | `i072-cooking-class` |
| `i259-childminder` | `i245-babysitter` |
| `i288-kennel` | `i284-pet-boarding` |
| `i363-vacation-rental` | `i353-airbnb` |
| `i399-attorney` | `i385-lawyer` |
| `i419-app-builder` | `i400-ai-tools` |

**MISC residual aliases (45):** `i462–i506` (`i462-doctor-alias` … `i506-notary-alias`). Filing leftovers after the DATE fold. Soft-D in the grammar review; **E** here.

**SKU-as-intent (7 unique labels):** WATER, TEA, BEER, COFFEE, WINE, SNACK, COCKTAIL. Product find already covers the item. Extra MISC aliases of COFFEE/WINE are also E.

---

## 7. Sample A vs D

**A — useful request already expressible**

| ID | One-line reason |
| --- | --- |
| `i001-doctor` | SEEK/OFFER capability “doctor”; specialty/reason stay in the sentence; `licensed` + availability already exist. |
| `i088-apartment` | Live apartment costume: bedrooms / rent / city / pets on the same find. |
| `i101-plumber` | Service provider find; `licensed` + urgency are existing keys. |
| `i138-rideshare` | Live ride costume: origin / destination / seats. |
| `i177-job` | Live jobs costume: side + roles + rate. |
| `i245-babysitter` | Live childcare costume: caregiver/parent + when. |
| `i308-date` | Alias to find(compatible entities). Not a DATE primitive. Safety/budget ride as constraints or sentence. |
| `i385-lawyer` | Experts costume: practice-area in the sentence, budget + availability as constraints. |
| `i400-ai-tools` | Agents costume: use-case / pricing / data-policy as offers + attributes. |

**D — model cannot express cleanly**

| ID | One-line reason |
| --- | --- |
| `i073-recipe` | Content (instructions), not a counterparty to match. |
| `i243-tradition` | Abstract category — nothing to publish as OFFER/SEEK. |
| `i252-child-support` | Enforcement / court process, not find(compatible entities). |
| `i255-kinship` | Genealogy, not a network publication. |
| `i448-lost-and-found` | Lost-item inventory, not who-else matching. |
| `i449-notice-board` | Bulletin content, not a matcher. |

---

## 8. B (31) — normalization only

Leaked shirts (ignore the costume, keep the noun): PERSONAL TRAINER as rideshare; PALLIATIVE / HOME / ELDER / DEMENTIA CARE as vehicle; WHEELCHAIR as beauty; CARPENTER as vehicle; CAR/BIKE REPAIR as home-job; GARAGE / CYCLE SHOP as trip; HOME MORTGAGE as house-job; ATM as finance-eligibility.

DATE-family aliases (compile to compatible-entity find): FRIEND, HANGOUT, ACTIVITY PARTNER, MATCHMAKER, RELATIONSHIP, DINING/TRAVEL/ACCOUNTABILITY companions, SPORTS/COWORKING buddies, NEW IN TOWN, HOST FAMILY.

Other remaps: `1ST AID` → first aid; `PAINTER ART` ≠ home PAINTER; RESUME / INTERVIEW → jobs/experts help; FAILOVER / DELEGATE → existing RELATION / ACTION.

---

## 9. What this is not

- Not 505 apps. Not 505 slot schemas. Not 505 matchers.
- Not a production seed of 505 fake entities.
- Not a claim that the live demo pool contains doctors, concerts, or banks. Seed-miss is expected.
- Not fulfillment: “book the 5:30” / “file my taxes” stay `PARTIALLY_COMPILABLE` at Sentinel (find who; do not complete the transaction).
- Not a reason to grow the three-lens UI. `/universe` lists **concepts**, generated from this catalog + status.

---

## 10. Re-run

```bash
pnpm coverage:505          # rewrite intents.json + summary.json + /universe data
pnpm coverage:505:test     # 505 denominator + A–E sum + alias→E
pnpm coverage:505:probe    # optional polite sample of https://whoelse-dating.vercel.app/api/compile
```

If someone later drops the real `intent-protocol.production-v0.3.json`, replace the compact cabinet and re-run. Do not “fix” 505 to 506 or 452.
