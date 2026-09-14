# 505-intent coverage vs the generic WhoElse core

**Question Tobias asked:** the UI shows three lenses. How many of the 505 historical intents are **already representable by the generic core** — not merely visible in the UI?

**Answer (re-run with `pnpm coverage:505`):**

| Class | Count | / 505 |
| --- | ---: | ---: |
| **A — fully covered** | **409** | 81.0% |
| **B — covered with normalization** | **31** | 6.1% |
| **C — needs one reusable extension** | **0** | 0.0% |
| **D — not yet representable** | **6** | 1.2% |
| **E — bad / duplicate / obsolete** | **59** | 11.7% |
| **Effective coverage = A+B** | **440** | **87.1%** |

```
UI lenses = Dating / Agents / Experts = 3
Semantic coverage = A+B / 505 = 440 / 505 = 87.1%
```

Those are different numbers on purpose. Lenses are costumes over one `whoelse.find`. Coverage is whether a useful request compiles to **ENTITY + OFFER/SEEK + CONSTRAINT + MATCH** without a new matching primitive.

**Before this PR (audit, PR #18):** A 371 / B 31 / C 38 / D 6 / E 59; A+B = 402/505 = 79.6%.

**After:** A 409 / B 31 / C 0 / D 6 / E 59; A+B = 440/505 = 87.1% (+38 A, +7.5 pp). All 18 eligibility + 16 reservation + 3 geo-radius + 1 inventory C rows moved to A. Same `whoelse.find`. No restaurant.find / bank.find.

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

**Already first-class constraint families:** city / region / neighborhood, price|budget|rent|rate, bedrooms / pets / furnished, origin / destination / seats, licensed, urgency, state, inStock, openNow, deliverToday, availableFrom / when, evidence kinds (license, verified, portfolio, outcome, reference, receipt), side + roles, **eligible** (income / creditScore / membership), **reservation** (bookable slot / hold), **remaining** (count, not boolean inStock), **radiusKm** (distance, not city equality).

**Already adjacent, not find:** ACTION (`invoke` / `delegate` / `connect` / …). Booking, paying, and filing are not WhoElse. `reservation` on find is inventory-at-time; ACTION `book` may follow.

**C is empty.** The audit’s four missing families shipped as keys on the same CONSTRAINT object. D (content / process / genealogy / bulletin) and E (aliases / SKUs) stay out of architecture.

---

## 3. Method

1. Load all 505 rows from the compact cabinet. Reject if count ≠ 505 or `i326` is present.
2. For each row, map a canonical SEEK/OFFER IR stub (capability = noun, side, optional geo/price/availability).
3. Classify **statically** against `packages/core` (schema, `parse.ts` heuristics, `compile.ts` Sentinel, known roles/lenses). Rules live in [`evals/intent-coverage/classify.ts`](../evals/intent-coverage/classify.ts) — the counts are not hand-waved.
4. Run local `compileLanguage` on each canonical query (heuristics only; no OpenAI required).
5. Optionally sample production `POST /api/compile` (`pnpm coverage:505:probe`) — polite batch, no writes, not required for the numbers.

**Production probe (2026-09-14):** 29 intents × 2 texts = 58 requests to `https://whoelse-dating.vercel.app/api/compile`. **58/58 HTTP 200**, all `WHOELSE_COMPILABLE` (canonical “Who else…?” plus `{LABEL} who else?`). That is the operator/Sentinel claim. It does **not** move C/D/E into A — compile accepts the sentence; representability is the A–E layer. Artifact: [`evals/intent-coverage/probe-results.json`](../evals/intent-coverage/probe-results.json).

Classification order: **E → D → C → B → A**.

| Class | Rule |
| --- | --- |
| **E** | `alias_of` set (52 rows) **or** SKU-as-intent overgeneration (WATER, TEA, BEER, COFFEE, WINE, SNACK, COCKTAIL). Deprecate. Do not invent architecture to keep the ID. |
| **D** | The useful request is not find(compatible entities): content, abstract category, enforcement process, genealogy, bulletin, lost-item inventory. |
| **C** | Same `whoelse.find`; the *primary useful* request needs one missing reusable primitive (not a vertical engine). **Empty after eligibility / reservation / remaining / radiusKm shipped.** |
| **B** | Generic engine works after alias / leaked-slot remap / Sentinel / DATE-family normalization. No new primitive. |
| **A** | Noun-find is already a useful request on ENTITY + OFFER/SEEK + existing constraints + MATCH. Specialty, vibe, reason ride in the sentence. |

Mechanical wrap of `{LABEL} who else?` → `Who else is a {label}?` is **not** enough to force B. That wrap is Sentinel’s job for every noun. B is only non-trivial remapping.

---

## 4. Exact counts

```
A / 505 = 409 / 505
B / 505 =  31 / 505
C / 505 =   0 / 505
D / 505 =   6 / 505
E / 505 =  59 / 505
A+B / 505 = 440 / 505 = 87.1%
```

409+31+0+6+59 = 505.

Attested vs fill does not change the denominator. Deep rows (`DOCTOR`, `RESTAURANT`, `DATE`, `AIRBNB`, `LAWYER`): A, A (reservation), A, A (reservation), A.

---

## 5. Shipped C extensions (reusable keys, not engines)

One reusable concept each. Same `whoelse.find`.

| Rank | Extension | Intents unlocked | What shipped (generic) | Examples |
| ---: | --- | ---: | --- | --- |
| 1 | **eligibility** | **18 → A** | `{ key: "eligible", op, value }` plus `income` / `creditScore` / `membership`. | BANK, LOAN, FINANCE MORTGAGE, INSURANCE, SCHOLARSHIP, SOCIAL HOUSING, LEGAL AID, ADOPTION, PET INSURANCE |
| 2 | **reservation** | **16 → A** | `{ key: "reservation", op: "truthy" }` bookable unit at time T (`when` optional). ACTION `book` is still not find. | RESTAURANT, HOTEL, AIRBNB, FLIGHT, CONCERT, TICKET, CAR RENTAL, ROOM BOOKING |
| 3 | **geo-radius** | **3 → A** | `radiusKm` on the query. City equality is not a hard gate; “within 5 km” does not mean Washington. | AMBULANCE, FOOD DELIVERY, BIKE MESSENGER |
| 4 | **inventory** | **1 → A** | `{ key: "remaining", op: "gte", value }` — remaining count, not boolean `inStock`. | PARKING |

`licensed`, `availability` (phrase), and `inStock` (boolean) already existed. Doctor / plumber / pharmacy stay **A**: “who else is a cardiologist near me this week?” is useful without insurance-network matching or a calendar grid.

Two-market `MORTGAGE`: HOME `i092` is **B** (housing shirt on a finance product). FINANCE `i161` is **A** (eligibility). Do not merge them into one ID.

“Near me” without a radius still defaults to Washington, DC for the dating seed. An explicit `within N km/miles` skips that default.

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
- Not a reason to grow the three-lens UI. `/universe` lists **concepts**, generated from this catalog + status. Filter with `?q=` (labels, questions, categories, class).

---

## 10. Re-run

```bash
pnpm coverage:505          # rewrite intents.json + summary.json + /universe data
pnpm coverage:505:test     # 505 denominator + A–E sum + alias→E
pnpm coverage:505:probe    # optional polite sample of https://whoelse-dating.vercel.app/api/compile
```

If someone later drops the real `intent-protocol.production-v0.3.json`, replace the compact cabinet and re-run. Do not “fix” 505 to 506 or 452.
