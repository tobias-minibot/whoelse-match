# Intent grammar v0.3 — review (draft)

**Status:** structure + Part 1/3 (intents 1–170). Parts 2–3 not yet recited. **No invented intents.**

**Framing:** Prior art / corpus of attempted human intents. Not ontology truth. Not current spec.

**Live laboratory (2026-09-13, `970fb94`):** [whoelse-dating.vercel.app](https://whoelse-dating.vercel.app) — 15-lens factory. Health: Dating + Apt + Jobs + Rides + Services + Products + Experts + Capital + Travel + Events + Childcare + Collab + Compute + Data + Local. MCP tools: `whoelse.find` / `whoelse_find` / `whoelse.register` / `whoelse.invoke` / `whoelse.delegate` / `whoelse.feedback`. One-box at `/universal`.

**Reconcile with:** [`LEGACY_506_ANALYSIS.md`](../LEGACY_506_ANALYSIS.md) (PR #5, 250 reconstructed IDs). This v0.3 recitation is the missing machine catalog: routing, slots, templates, DATE fold.

**Compact file:** [`legacy/intent-protocol/intent-protocol.production-v0.3.compact.json`](../legacy/intent-protocol/intent-protocol.production-v0.3.compact.json) — parse-only, incomplete until 505.

---

## 0. How to read this review

Kill most of the catalog. Keep building WhoElse. The question is not “which of 505 engines to port.” It is: what did the old grammar already discover, and what compresses into `whoelse.find` + constraints.

Thesis (preview, to be confirmed after Part 3):

> The catalog helps humans *express*. The protocol lets machines *exchange*. Yes — they are complementary. The 505 nouns are a human-language filing cabinet and an eval corpus. They are not a runtime enum. Machines should exchange ENTITY / OFFER / SEEK / CONSTRAINT / EVIDENCE / ACTION / MATCH, not `i001-doctor`.

---

## 1. What the old grammar tried

*(Fill remaining subgroups from Parts 2–3.)*

Production v0.3 tried to be a **complete human-life NLU catalog**: one intent ID per noun, a life-category subgroup, a routing hint, a verification status, and a **slot template** so a voice/text front-end could ask `INTENT who else?` with a few fields.

Part 1 proves the shape:

| Piece | What it was for |
| --- | --- |
| Stable-looking IDs (`i001-doctor`) | Filing + protocol addressing |
| ALL-CAPS labels | Human encoding (`DOCTOR who else?`) |
| 22 subgroups | Yellow-pages spine (Part 1 shows 6: BODY & HEALTH, FITNESS & SPORT, FOOD & DRINK, HOME & LIVING, TRANSPORT & MOBILITY, FINANCE) |
| Routing `geo-anchored` / `mixed` / `network-routed` | Where fulfillment lives — clinic vs marketplace vs institution |
| Status `verified` / `fragmented` / `estimated` / `untagged` | Catalog hygiene, not runtime trust |
| `deep=1` | A few intents got real slot enums / templates; the rest inherited a **group template** |
| Slot keys | Per-intent (often `{slug}-{role}`) so an NLU could fill a form |

It was a **meaning card + router**, not a matcher. PR #5 already said this: every recovered phrase is `FIND`. v0.3 adds evidence that they also tried **fulfillment-shaped slots** (book a visit, pick a vehicle, hold a reservation) and **copied templates across nouns**.

Compared with PR #5’s reconstructed 36 global roles (LOCATION, BUDGET, …): v0.3 did **not** ship 36 globals. It shipped **per-noun keys** that secretly repeat 8–10 templates. That is the overgeneration.

---

## 2. Genuinely valuable

Recover these; do not recover the IDs.

1. **The DATE fold.** Former Dating ⊂ DATE. Synonyms (dating, meet someone, romance) belong on one intent-level *sentence family*. Live dating is a **costume** (sectioned Humans then AIs, compatibility seeks) — not a second ID. *DATE row arrives in Part 2/3; fold is already attested.*
2. **Routing as a property of the *world*, not the operator.** Geo vs mixed vs network is a real distinction: a dentist is place-bound; a restaurant is place + reservation graph; a bank product is institutional/network. WhoElse already encodes this as `location` + `type` + seed, not as three matchers.
3. **Slot *roles* underneath the leaked names.** specialty/reason/payment/visit/availability (DOCTOR) and cuisine/diet/occasion/party-size/reservation/budget (RESTAURANT) are good *constraint vocabulary*. They map to universal constraints, not to `findDoctor`.
4. **AI TOOLS surface vocab** (Part 3 expected: use-case, user-type, integration, pricing, data-policy) — the right nouns for agent/MCP capability discovery. Keep as seed language + optional constraints.
5. **Duplicate labels as aliases.** `MORTGAGE` already appears twice in Part 1 (`i092` HOME geo vs `i161` FINANCE network). That is the catalog confessing “same word, two markets.” WhoElse’s two-market lesson (jobs vs labor; listing vs seeker) is the same finding.
6. **Template leakage as a *proof* of collapse.** PERSONAL TRAINER carrying origin/destination/departure/travelers is not a fitness ontology. It is a copy-paste that accidentally shows transport and sport are the same operator with different nouns.
7. **Human phrase `NOUN who else?`.** Preserve the sentence. Do not require the token.

---

## 3. Broken / overgenerated

Attested in Part 1 (do not wait for the rest to call these broken):

| Leak | Rows | Wrong template |
| --- | --- | --- |
| Care-as-transport | `i025` PALLIATIVE CARE, `i034` HOME CARE, `i035` ELDER CARE, `i036` DEMENTIA CARE | `vehicle, need, time, price` (± reason/service) |
| Device-as-beauty | `i032` WHEELCHAIR | `service, style, availability, price, reason` |
| Trainer-as-rideshare | `i038` PERSONAL TRAINER | `origin, destination, departure, travelers, preference` |
| Class-as-education inside food | `i072` COOKING CLASS | `subject, level, learner, format, schedule` (food peers use `item, diet, fulfillment, price, hours`) |
| Trade-as-vehicle | `i105` CARPENTER | `vehicle, need, time, price, service` |
| Repair-as-home-job on vehicles | `i131` CAR REPAIR, `i146` BIKE REPAIR | `job, property-type, urgency, trust, budget` |
| Place-as-trip | `i135` GARAGE, `i136` PARKING, `i147` CYCLE SHOP | `origin, destination, time, mode, party-size` |

Overgeneration pattern: **one template per subgroup, then a few nouns that do not fit get the neighboring subgroup’s template.** That is how you get 505 “schemas” out of ~10 slot families.

Also overgenerated (even when the template fits):

- Specialist clones (`i007`–`i018`) that differ only by the `{slug}-reason` prefix.
- Food SKUs (`WINE` / `BEER` / `COFFEE` / `TEA` / `WATER` / `SNACK`) as separate intents — these are **diet/item constraints** on FOOD, not operators.
- HOME utilities (`INTERNET` / `TV` / `PHONE` / `HEATING`) sharing `property-type, urgency, budget, trust` — a house constraint family, not 40 endpoints.

SPORTS TEAM “food” leakage from the briefing is **not** in Part 1 (`i054` uses the fitness template). Treat the briefing as a pointer; the recitation is authoritative. Re-check after Parts 2–3 (possible second COOKING CLASS / SPORTS TEAM).

---

## 4. Preserve

| Keep | Why | Where it lives now |
| --- | --- | --- |
| Human sentence / `NOUN who else?` encodings as *story* | Landing + eval phrases | landing, probe suite |
| DATE as the romance/social sentence family (when recited) | Fold already claimed | dating costume + `DATING_LANG` |
| Routing intuition (geo / mixed / network) | Explains seed + `location` + type mix | not a new field required |
| Deep slot *roles* as constraint hints | Doctor / restaurant / (later) date, airbnb, lawyer | `WhoElseConstraints.attributes` |
| Duplicate labels as alias table | Mortgage ×2 already | NL synonyms / eval, not IDs |
| AI TOOLS vocab (when recited) | Agent discovery | seed `offers` + MCP |
| Catalog as **test corpus** | Regression + NL mapping | `legacy/` only |

---

## 5. Deprecate

| Kill | Why |
| --- | --- |
| Runtime enum of 505 IDs | August fold already proved IDs are unstable; live engine never saw them |
| Per-noun slot schemas | Templates leaked; roles are universal |
| Per-noun handlers (`findDentist`) | Forbidden by doctrine and by `@whoelse/core` |
| Status (`verified`/`fragmented`/…) as trust | Catalog hygiene ≠ `trust.evidence` |
| Subgroup as architecture | 15 live lenses already showed labels are costumes |
| Fulfillment smuggled into slots (reservation, visit, vehicle book) | Adjacent ACTION stubs; not find |
| Reconciling 506/505/452 in production | Version ledger stays archaeological |

---

## 6. Map to ENTITY / OFFER / SEEK / CONSTRAINT / EVIDENCE / ACTION / MATCH

| v0.3 piece | Primitive | Notes |
| --- | --- | --- |
| Intent noun (DOCTOR, PLUMBER, BANK) | ENTITY `type` + `offers` vocabulary | Noun is a value, not a type |
| “Who else is a dentist” vs “who else needs a dentist” | SEEK vs OFFER / `side` | Catalog usually assumed seeker→provider |
| Slot keys that change *who matches* | CONSTRAINT `{key, op, value}` | location, budget, availability, diet, licensed |
| Slot keys that change *the sentence* | stay in `intent` text | occasion, vibe, reason |
| `trust` / licensed / verified catalog status | EVIDENCE (artifacts) — **not** catalog `status` | Jobs already did this |
| Reservation / book / visit / invoke | ACTION (`next.action`, invoke stub) | Do not find-book |
| Pairing a seek to an offer | MATCH record | Persistence of a find, not a second tool |
| Routing geo | CONSTRAINT `city` / `location` | Soft geo; keep AIs |
| Routing mixed | mixed-type pool + optional reservation ACTION | Restaurant is the type specimen |
| Routing network | ENTITY in a non-geo pool (bank, AI tool, MCP) | `type: agent\|company\|service` |

Part 1 worked examples:

- `i001-doctor` → `whoelse.find({ intent: "Who else is a doctor …", type: "service" })` + constraints specialty/reason/payment/visit/availability.
- `i088-apartment` → already live: listing/seeker + rent/bedrooms. Slots `property-type, urgency, budget, trust` ⊂ existing attributes.
- `i138-rideshare` → already live: origin/destination/seats/state.
- `i157-bank` → `whoelse.find` over company/service + amount/fees as attributes. No `bank.find`.

---

## 7. Map to MCP `whoelse.find` (+ register / invoke / delegate / feedback)

| v0.3 desire | MCP |
| --- | --- |
| Discover who can fulfill the noun | `whoelse.find({ intent })` |
| Publish a provider / agent / listing | `whoelse.register` |
| Do the thing (book, pay, call, run) | `whoelse.invoke` — stub ACTION, not find |
| Hand off when A cannot | `whoelse.delegate` (find → select → invoke → receipt) |
| “Not like this one” | `whoelse.feedback` |

Do **not** mint `whoelse.doctor` or `whoelse.finance`. FINANCE in Part 1 is already `network-routed` — that is “entities without a required city,” which find already allows.

---

## 8. 505 canonical vs aliases vs collapse

*(Counts locked only after Part 3.)*

**Working hypothesis (from briefing + Part 1):** 53 duplicate labels ≈ Protocol v2’s alias budget (452 canonical + 54 aliases = 506; August dropped DATING → 53 extras on 505). Part 1 already has one pair: `MORTGAGE` ×2.

Collapse classes (run on every subgroup after 505 land; **≥1 per 22 subgroups + all 5 deep**):

| Class | Meaning | Part 1 examples |
| --- | --- | --- |
| **A** clean on `whoelse.find` | Noun + sentence is enough | DOCTOR, RESTAURANT, APARTMENT, PLUMBER, RIDESHARE, BANK |
| **B** awkward missing piece | Find works; a constraint or ACTION is thin | AIRPORT TRANSFER (luggage/vehicle), TAX (jurisdiction), PHONE (device/issue) |
| **C** domain extension | Same op; seed/constraint keys must exist | MORTGAGE (two markets), FOOD SHARING / FOOD BANK (reciprocal + civic), CRYPTO |
| **D** not WhoElse | Catalog smuggled fulfill / inventory / civic process | RECIPE (content), WATER-as-SKU, maybe later government filings |

**Proposed N (Part 1 only, will revise):**

`505 → ~1 operator + ~12 constraint families + 4 adjacent verbs ≈ 17 ops+constraints`

Constraint families already visible: location/geo, time/availability, budget/price/fees, payment, party-size/travelers, origin/destination, diet/item, property-type, urgency, trust/evidence, product/eligibility, specialty/skill.

---

## 9. Ten insights

1. v0.3 is a **template engine pretending to be an ontology**. Prefixing `plumber-job` vs `builder-job` does not create two schemas.
2. **Routing is the most adult field** in the catalog. Geo / mixed / network is closer to a product truth than the 22 subgroups.
3. **Deep ≠ important-as-ID.** Deep means “someone wrote real slots.” Those five are constraint gold. The other 500 are clones.
4. **DATE at intent level is a costume label.** `relation` / `compatible_with` is more fundamental — dating, hiring, rideshare, and agent-delegation are the same matching op (find complements). Live code already believes this (`offers`↔`seeks`).
5. **Duplicate labels are two-market signals**, not data-entry errors (MORTGAGE home vs finance).
6. **Leakage is the collapse proof.** If a trainer can wear a rideshare form, you do not need `findTrainer`.
7. PR #5’s 250 reconstructed names were directionally right and **ID-wrong**. Prefer `i001-doctor` as the archaeological key; do not revive `DOCTOR` as a core symbol.
8. Catalog `status` is not EVIDENCE. Mixing them would recreate a trust score.
9. FINANCE went `network-routed` while HOME MORTGAGE stayed geo — the catalog already split “place I walk into” vs “product I apply for.”
10. **Humans need the catalog; machines need the protocol.** One-box synonyms help people. MCP tools help agents. Neither needs 505 enums.

---

## 10. Independent discoveries

*(This archaeology pass — not in PR #5.)*

- Slot keys are **prefixed clones** of ~10 families; the 36-role reconstruction in PR #5 was a better *abstraction* than the production file, even though the production file is the better *artifact*.
- BODY & HEALTH is 36 rows (i001–i036), not 37; FITNESS starts at GYM i037. Briefing samples were correct; inferred ranges were not. **Do not invent ranges.**
- WHEELCHAIR beauty slots and care-transport slots are in the recitation, not just the briefing.
- COOKING CLASS in FOOD already uses the education template — duplication (second COOKING CLASS) still expected later.
- PHONE (`need, device, issue, turnaround, price`) is a rare **unprefixed** repair card — closer to a universal constraint family than its neighbors.
- AIRPORT TRANSFER is the only Part 1 transport row with a purpose-built slot set (`origin, airport, time, passengers, vehicle, luggage`) — evidence that “deep-ish” work happened without `deep=1`.
- Live 15-lens factory already covers the Part 1 nouns that matter (doctor-like → Experts/Services, apartment, plumber, rideshare, capital/finance) **without those IDs**.

---

## DATE vs current dating lens

*(DATE row `i308` not in Part 1. Structure now, verdict after recitation.)*

| | v0.3 DATE (claimed) | Live dating lens |
| --- | --- | --- |
| ID | `i308-date` SOCIAL mixed verified deep | no ID |
| Template | DATE who else? (date-type, format, date, location, safety, budget) | free sentence + `offers`/`seeks` + attributes |
| Synonyms | dating, meet someone, romance | `DATING_LANG` (`date`, `meet`, dinner, mountain bike, thought partner…) |
| UI | unknown (catalog) | Humans then AIs sectioned; compatibility seeks |
| Fold | DATING ⊂ DATE | never had two IDs |

**Ask:** DATE at intent level? **No as architecture, yes as a lens name.**  
**More fundamental:** `compatible_with` / complementary offer↔seek.  
**Same matching op?** Dating / hiring / rideshare / agent-delegation — **yes**, one `whoelse.find`. Difference is trust layout (section vs mix) and constraint keys (safety vs rate vs seats vs data-policy).

Optional low-risk one-box hint (defer until Part 3 if still cheap): add `romance` / `meet someone` to `DATING_LANG` without adding a DATE enum.

---

## Routing: geo / mixed / network

Part 1 distribution (170 rows):

| Routing | n | Subgroups |
| --- | ---: | --- |
| geo-anchored | 129 | BODY, FITNESS, HOME, TRANSPORT |
| mixed | 27 | FOOD & DRINK (all) |
| network-routed | 14 | FINANCE (all) |
| missing | 0 | — (16 claimed globally; not in Part 1) |

Live mapping:

- **geo** → `city` / `location` / neighborhood; keep AIs when hard-geo would hide them.
- **mixed** → place + graph (reservation, delivery, sharing). Restaurant is the type specimen; live seed is thin here.
- **network** → no required geo; company/agent/product pool. Capital + agents already do this.

Do not add a `routing` field to core. Infer from entity `location` presence + `type`.

---

## Slots → universal constraints

| v0.3 slot family (Part 1) | Universal constraint / field |
| --- | --- |
| specialty / procedure / reason / care-type | `intent` + optional attribute `specialty` |
| payment / price / budget / fees / amount | existing price parser (`rent`/`rate`/`price`/`budget`/`ticketSize`) |
| visit / visit-mode / availability / schedule / hours / timeline | `availability` + time phrases (already soft) |
| provider-type / user-type | `type` |
| cuisine / diet / item | attributes + seed vocabulary |
| occasion / format / preference / vibe | `intent` / `preferences` |
| party-size / travelers / passengers | attribute `seats` / `partySize` |
| reservation | ACTION, not find |
| property-type / urgency / trust | apartment/services attributes + evidence |
| origin / destination / departure / airport | rides attributes (live) |
| vehicle / need / time | STATE + availability — leaked when copied onto care |
| product / eligibility | capital/finance attributes |
| subject / level / learner | education costume; still find |
| device / issue / turnaround | repair family = services |
| style (wheelchair) | **do not keep** as beauty; map to `device` / accessibility constraint if ever seeded |

---

## A/B/C/D collapse experiment

**Rule:** ≥1 intent per 22 subgroups + all 5 deep. Part 1 can only score 6 subgroups + 2 deep.

| Subgroup / deep | Pick | Class | Compresses to |
| --- | --- | --- | --- |
| BODY & HEALTH / **DOCTOR** | `i001-doctor` | **A** | find + specialty/payment/availability |
| FITNESS & SPORT | `i038-personal-trainer` | **A** (leak) | find + schedule; ignore transport slots |
| FOOD & DRINK / **RESTAURANT** | `i060-restaurant` | **A** | find + cuisine/diet/party-size/budget; reservation = ACTION |
| HOME & LIVING | `i088-apartment` + `i101-plumber` | **A** | already live |
| TRANSPORT & MOBILITY | `i138-rideshare` | **A** | already live |
| FINANCE | `i157-bank` + `i161-mortgage` | **C** | find + amount/fees; two-market vs HOME mortgage |
| **DATE** | — | TBD Part 2/3 | — |
| **AIRBNB** | — | TBD | — |
| **LAWYER** | — | TBD | — |
| remaining 16 subgroups | — | TBD | — |

Part 1 D-candidate: `i073-recipe` (content, not an entity pool). Soft-D: SKU drinks.

**Estimate after Part 1:** most of 170 are **A**. A handful of **C** (mortgage split, food-bank, crypto). Almost no **B**. **D** is content/inventory. Global N stays ~**1 find + ~12 constraints + register/invoke/delegate/feedback**.

---

## Catalog roles (what this file is *for*)

| Role | Use? | How |
| --- | --- | --- |
| Test corpus | **Yes** | Probe sentences; do not assert IDs |
| Regression | **Yes** | “dentist still expressible”; seed-miss is OK |
| NL mapping | **Yes, thin** | Synonym hints (DATE/dating/romance) |
| Vocab | **Yes** | Seed `offers`/`seeks` nouns |
| Seed | **Selective** | Only if a second vertical needs the words |
| Eval | **Yes** | A/B/C/D labels after 505 |
| Production enum | **No** | — |
| Slot schemas / vertical engines | **No** | — |

---

## Part 1 subgroup index (authoritative)

| n | Subgroup | Routing | Count | Deep |
| ---: | --- | --- | ---: | --- |
| 1–36 | BODY & HEALTH | geo-anchored | 36 | DOCTOR |
| 37–59 | FITNESS & SPORT | geo-anchored | 23 | — |
| 60–86 | FOOD & DRINK | mixed | 27 | RESTAURANT |
| 87–129 | HOME & LIVING | geo-anchored | 43 | — |
| 130–156 | TRANSPORT & MOBILITY | geo-anchored | 27 | — |
| 157–170 | FINANCE | network-routed | 14 | — |

Part 1 status mix (parsed): verified 95 · estimated 35 · fragmented 31 · untagged 9.  
Part 1 duplicate labels: `MORTGAGE` only (1 extra row). Claimed 53 extras still ahead.

---

## Open (blocked on Parts 2–3)

- Remaining ~16 subgroups and IDs i171–i505 — **do not invent**
- DATE / AIRBNB / LAWYER deep slot keys and enums
- AI TOOLS (`i400`) capability vocab
- Confirm 235/198/56/16 routing and 248/128/113/16 status
- Confirm 53 duplicate labels and COOKING CLASS second copy
- Final N and full A/B/C/D table
- Optional one-box synonym PR (low-risk, after DATE row is in hand)

---

## Verdict so far (not final)

PR #5’s operator claim survives contact with real IDs: **true at the operator layer, false as a fulfillment story.** v0.3 is richer evidence for the same collapse, plus a routing axis and a slot-template scandal. Keep the compact file as archaeology. Keep building the one-box.
