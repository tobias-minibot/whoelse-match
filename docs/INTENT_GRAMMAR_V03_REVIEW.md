# Intent grammar v0.3 — review

**Framing:** Prior art / corpus of attempted human intents. Not ontology truth. Not current spec.

**Live laboratory (2026-09-13, `970fb94`):** [whoelse-dating.vercel.app](https://whoelse-dating.vercel.app) — 15-lens factory. Health: Dating, Apt, Jobs, Rides, Services, Products, Experts, Capital, Travel, Events, Childcare, Collab, Compute, Data, Local. MCP: `whoelse.find` / `whoelse_find` / `whoelse.register` / `whoelse.invoke` / `whoelse.delegate` / `whoelse.feedback`. One-box: `/universal`.

**Compact file:** [`legacy/intent-protocol/intent-protocol.production-v0.3.compact.json`](../legacy/intent-protocol/intent-protocol.production-v0.3.compact.json)  
**Provenance:** Tobias archaeology attachment = annotated recitation of `intent-protocol.production-v0.3.json`. **172 attested** rows (n=1–170 + DATE + AI TOOLS). **333 fill** rows from subgroup counts + PR #5 names. SOCIAL skips `i326`. Full slot enums stay in the attachment — not imported.

**Reconcile with:** [`LEGACY_506_ANALYSIS.md`](../LEGACY_506_ANALYSIS.md) (PR #5). Operator claim unchanged. This file is the missing *cabinet*.

---

## Thesis

> The catalog helps humans *express*. The protocol lets machines *exchange*. **Yes — they are complementary.** Do not unify them by shipping 505 enums.

Humans need `DATE who else?` / `dating` / `meet someone` so a sentence can start. Machines need `whoelse.find({ intent })` plus ENTITY / OFFER / SEEK / CONSTRAINT / EVIDENCE / ACTION / MATCH. The 505 nouns are a filing cabinet and an eval corpus. They are not a runtime.

**DATE is not a primitive.** It is an alias that compiles to `find(compatible entities)` under constraints (when, where, safety, budget). Live dating already discovered the real product: humans and AIs in one pool, sectioned UI, offer↔seek, recursive Who else?, evidence — not dinner-date enums. Hiring, rideshare, and agent-delegation are the same matching op.

---

## 1. What the old grammar tried

Production v0.3 tried to be a **complete human-life NLU catalog**: one ID per noun, a life-category subgroup, a routing hint, a verification status, and a **slot template** so a front-end could ask `INTENT who else?` as a form.

| Piece | Job |
| --- | --- |
| IDs (`i001-doctor`) | Filing + protocol addressing |
| ALL-CAPS labels | Human encoding (`DOCTOR who else?`) |
| 22 subgroups | Yellow-pages spine |
| Routing `geo-anchored` / `mixed` / `network-routed` / `missing` | Where fulfillment lives |
| Status `verified` / `fragmented` / `estimated` / `untagged` | Catalog hygiene, not trust |
| `deep=1` (five only) | Someone wrote real slots |
| Slot keys | Usually `{slug}-{role}` clones of ~10 templates |

It was a **meaning card + router**, not a matcher. PR #5: every recovered phrase is `FIND`. v0.3 adds fulfillment-shaped slots (reservation, visit, vehicle) and **copied templates across nouns**.

It did **not** ship PR #5’s 36 global roles. It shipped per-noun keys that secretly repeat a handful of families. That is the overgeneration.

The DATE fold is the grammar’s only attested self-correction: Dating ⊂ DATE; `i326` is missing in source (hypothesized retired `DATING` ID). IDs were not perfectly stable.

---

## 2. Genuinely valuable

1. **DATE fold + event framing.** One sentence family (dating, meet someone, romance). Slots `date-type, format, date, location, safety, budget`. Kind: **event** — a when/where gathering, not a profile type.
2. **Routing as a property of the world.** Geo vs mixed vs network is real: clinic vs marketplace vs institution. Encode as `location` presence + `type`, not three matchers.
3. **Deep slot *roles*.** Doctor (specialty/reason/payment/visit/availability) and restaurant (cuisine/diet/occasion/party-size/reservation/budget) are constraint gold.
4. **AI TOOLS vocab.** `use-case, user-type, integration, pricing, data-policy` — the right surface for agent/MCP capability discovery. Seed language, not `ai.find`.
5. **Duplicate labels as two-market / alias signals.** `MORTGAGE` ×2 (HOME geo vs FINANCE network). COOKING CLASS in FOOD and EDUCATION. Same word, two costumes.
6. **Template leakage as collapse proof.** If a trainer can wear a rideshare form, you do not need `findTrainer`.
7. **`NOUN who else?` as human language.** Keep the sentence. Do not require the token.
8. **22-group breadth as a test corpus.** Life + digital + misc residual. Enough to prove one operator; not enough to become a registry.

---

## 3. Broken / overgenerated

Attested leaks (Part 1 — do not soften):

| Leak | Rows | Wrong template |
| --- | --- | --- |
| Care-as-transport | PALLIATIVE / HOME / ELDER / DEMENTIA CARE | `vehicle, need, time, price` |
| Device-as-beauty | WHEELCHAIR | `service, style, availability, price, reason` |
| Trainer-as-rideshare | PERSONAL TRAINER | `origin, destination, departure, travelers, preference` |
| Class-as-education in food | COOKING CLASS (`i072`) | `subject, level, learner, format, schedule` |
| Trade-as-vehicle | CARPENTER | `vehicle, need, time, price, service` |
| Repair-as-home-job | CAR REPAIR, BIKE REPAIR | `job, property-type, urgency, trust, budget` |
| Place-as-trip | GARAGE, PARKING, CYCLE SHOP | `origin, destination, time, mode, party-size` |

Briefing “RESTAURANT education-style” is **not** in the attested restaurant row (that row is the good deep food template). The education shirt is on COOKING CLASS — then duplicated again in EDUCATION. SPORTS TEAM in Part 1 uses the fitness template, not food.

Catalog facts that must be listed (Tobias recitation + attested Part 1):

| Required leak | Where |
| --- | --- |
| PERSONAL TRAINER origin/destination | `i038` — rideshare shirt |
| PALLIATIVE / HOME / ELDER CARE vehicle | `i025`, `i034`, `i035` (+ dementia `i036`) |
| WHEELCHAIR beauty slots | `i032` — `style, availability, price` |
| RESTAURANT education-style | **not** on attested `i060` (cuisine/diet/occasion/…); the education shirt is COOKING CLASS |
| COOKING CLASS duplicated | `i072` FOOD + EDUCATION fill |
| MISC residual duplicates | 45 alias rows; 53 extra duplicate-label rows catalog-wide |

Overgeneration even when the template fits: 15 specialists that differ only by `{slug}-reason`; drink SKUs (`WATER`, `TEA`) as intents; HOME utilities sharing one house-constraint family.

---

## 4. Preserve

| Keep | Where |
| --- | --- |
| Human sentence / encodings as story | landing, eval phrases |
| DATE as a *lens name* and synonym family | dating costume + `DATING_LANG` + [`onebox-alias-hints.json`](../legacy/intent-protocol/onebox-alias-hints.json) |
| Routing intuition (geo / mixed / network) | inferred from entity `location` + `type` |
| Deep slot roles as constraint hints | `WhoElseConstraints.attributes` |
| Duplicate labels as alias table | NL + eval, not IDs |
| AI TOOLS vocab | seed `offers` + MCP |
| Catalog as **test corpus** | `legacy/` only |

---

## 5. Deprecate

| Kill | Why |
| --- | --- |
| Runtime enum of 505 IDs | Fold + `i326` hole prove instability; live engine never saw them |
| Per-noun slot schemas | Templates leaked; roles are universal |
| Per-noun handlers | Doctrine + `@whoelse/core` |
| Catalog `status` as trust | Hygiene ≠ `trust.evidence` |
| Subgroup as architecture | 15 live lenses already showed costumes |
| Fulfillment smuggled into slots | ACTION stubs |
| Reconciling 506/505/452 in production | Version ledger stays archaeological |
| Fill-row IDs (`i353-airbnb`, …) as gospel | They are labeled `reconstructed-to-fill` |

---

## 6. Map to ENTITY / OFFER / SEEK / CONSTRAINT / EVIDENCE / ACTION / MATCH

| v0.3 piece | Primitive | Notes |
| --- | --- | --- |
| Intent noun | ENTITY `type` + `offers` vocabulary | Noun is a value |
| Who-has vs who-needs | SEEK vs OFFER / `side` | Catalog usually assumed seeker→provider |
| Slots that change *who matches* | CONSTRAINT `{key,op,value}` | location, budget, availability, diet, licensed |
| Slots that change *the sentence* | stay in `intent` | occasion, vibe, reason, date-type |
| Catalog `verified` / licensed | EVIDENCE artifacts | not a score |
| Reservation / book / visit / invoke | ACTION | `next.action` / `whoelse.invoke` |
| Pairing a seek to an offer | MATCH record | persistence of a find |
| Routing geo | `city` / `location` | keep AIs when hard-geo hides them |
| Routing mixed | mixed-type pool + optional ACTION | restaurant / DATE / AIRBNB |
| Routing network | no required geo | BANK, AI TOOLS, MCP |

Worked calls (all one tool):

```
whoelse.find({ intent: "Who else is a doctor near me this week?", type: "service" })
whoelse.find({ intent: "Who else has a 1-bedroom in DC under $2500?" })
whoelse.find({ intent: "Who else can give me a ride?" })
whoelse.find({ intent: "Who else should I date?" })
whoelse.find({ intent: "Who else can summarize this PDF?", type: "agent" })
```

---

## 7. Map to MCP `whoelse.find` (+ register / invoke / delegate / feedback)

| Desire | MCP |
| --- | --- |
| Discover who satisfies the noun | `whoelse.find({ intent })` |
| Publish a provider / agent / listing | `whoelse.register` |
| Do the thing | `whoelse.invoke` (stub ACTION) |
| A cannot → B | `whoelse.delegate` |
| Not like this one | `whoelse.feedback` |

**NL path (humans):** sentence → optional alias hint (`dating`→DATE family) → `whoelse.find`. Alias is a *hint*, not an enum lookup.

**Agent path:** skip the alias. Call `whoelse.find` with the task sentence (`use-case`, `data-policy` may ride in the string or as attributes). Do not mint `whoelse.doctor` or `whoelse.date`.

---

## 8. 505 canonical vs aliases vs collapse

Protocol v2 claimed 452 canonical + 54 aliases = 506 IDs. August dropped DATING → **53 extra duplicate-label rows on 505**. This compact file has **53 extra rows** sharing labels (52 distinct duplicated labels; one label appears 3×). That arithmetic is the alias budget, not 53 bugs.

**Canonical** = first row of a label (usually attested or the deep/fill head).  
**Alias** = later row with the same label (MISC residual, COOKING CLASS #2, ATTORNEY→LAWYER, VACATION RENTAL→AIRBNB, …).  
**Collapse** = forget the ID; keep the sentence + constraints.

### A/B/C/D — ≥1 per 22 subgroups + all 5 deep

| Class | Meaning |
| --- | --- |
| **A** | Clean on `whoelse.find` |
| **B** | Find works; a constraint or ACTION is thin |
| **C** | Same op; two-market / seed keys must exist |
| **D** | Not WhoElse (content, civic process, inventory truth) |

| Subgroup / deep | Pick | Class | Compresses to |
| --- | --- | --- | --- |
| BODY / **DOCTOR** | `i001-doctor` | **A** | find + specialty/payment/availability |
| FITNESS | `i038-personal-trainer` | **A** | find + schedule; **ignore** transport slots |
| FOOD / **RESTAURANT** | `i060-restaurant` | **A** | find + cuisine/diet/party/budget; reservation = ACTION |
| HOME | `i088-apartment` + `i101-plumber` | **A** | already live |
| TRANSPORT | `i138-rideshare` | **A** | already live |
| FINANCE | `i157-bank` + `i161-mortgage` | **C** | find + amount/fees; two-market vs HOME mortgage |
| WORK | `JOB` | **A** | already live (jobs lens) |
| EDUCATION | `COOKING CLASS` #2 | **C** | same as food class; one education constraint family |
| CULTURE | `MUSEUM` | **A** | find + location/schedule |
| FAMILY | `BABYSITTER` | **A** | already live (childcare) |
| BEAUTY | `HAIRDRESSER` | **A** | find + style/price — also the WHEELCHAIR leak source |
| PETS | `VET` | **A** | find + schedule/location |
| FASHION | `CLOTHING` | **A** | find + item/price (products/local) |
| SOCIAL / **DATE** | `i308-date` | **A** | find(compatible entities) + when/where/safety/budget |
| ENV | `MUTUAL AID` | **A** | find + topic/location |
| TRAVEL / **AIRBNB** | `i353-airbnb` | **A** | already live (travel reuses apt listing/seeker) |
| CREATIVE | `PHOTOGRAPHER` | **A** | find + medium/schedule |
| LEGAL / **LAWYER** | `i385-lawyer` | **A** | find + matter/language/budget (experts lens) |
| DIGITAL | `i400-ai-tools` | **A** | find + use-case/pricing/data-policy |
| EVENTS | `CONFERENCE` | **A** | already live (events lens) |
| LOCAL | `OPEN NOW SHOP` | **A** | already live (local `openNow`) |
| MISC | alias `DOCTOR` | **D** | residual filing; do not seed |

Part 1 D-candidates still stand: `RECIPE` (content), drink SKUs. Soft-D: MISC aliases.

**Estimate: 505 → ~17 ops+constraints**

`1 × whoelse.find` + ~12 constraint families (geo, time/availability, budget/price, payment, party-size, origin/destination, diet/item, property-type, urgency, evidence, product/eligibility, specialty/skill) + 4 adjacent verbs (`register`, `invoke`, `delegate`, `feedback`).

Not 505. Not 22. Not 3 matchers. **One find.**

---

## 9. Ten insights

1. v0.3 is a **template cloner pretending to be an ontology**.
2. **Routing is the most adult field.** Closer to product truth than the 22 subgroups.
3. **Deep ≠ important-as-ID.** Deep means someone wrote slots. Those five are constraint gold.
4. **DATE at intent level is a costume label.** `compatible_with` / complementary offer↔seek is the operator. Dating, hiring, rideshare, agent-delegation are the same `whoelse.find`. Difference is trust *layout* (section vs mix) and constraint keys (safety vs rate vs seats vs data-policy).
5. **Duplicate labels are two-market or alias signals**, not always typos (`MORTGAGE`, COOKING CLASS).
6. **Leakage is the collapse proof.**
7. PR #5’s 250 names were directionally right and **ID-wrong**. Prefer attested `i001-doctor` as archaeology; do not revive `DOCTOR` as a core symbol.
8. Catalog `status` is not EVIDENCE.
9. FINANCE is `network-routed` while HOME MORTGAGE is geo — “place I walk into” vs “product I apply for.”
10. **Humans need the catalog; machines need the protocol.** One-box synonyms help people. MCP tools help agents. Neither needs 505 enums.

---

## 10. Independent discoveries

- Slot keys are prefixed clones of ~10 families. PR #5’s 36-role list was a better *abstraction*; this file is the better *artifact*.
- BODY is 36 (i001–i036); FITNESS starts at GYM i037. Do not invent ranges.
- **`i326` skip** is the DATE fold left a hole. 505 = `{i001…i506} \ {i326}`.
- PHONE (`need, device, issue, turnaround, price`) is a rare unprefixed repair card — closer to a universal family than its neighbors.
- AIRPORT TRANSFER has purpose-built slots without `deep=1` — “deep-ish” work happened off the deep flag.
- Live 15-lens factory already covers the nouns that matter **without those IDs**.
- AI TOOLS is n=399 in the compact index because of the skip (`id` stays `i400-ai-tools`).
- WHEELCHAIR beauty slots and BEAUTY’s `service,style,…` template are the same shirt.
- “RESTAURANT education-style” in the briefing does not match the attested restaurant row; the education leak is COOKING CLASS (then duplicated).

---

### PREVIOUS WHOELSE WORK

PR #5 (`LEGACY_506_ANALYSIS.md`) already proved `whoelse.find` can *express* every recovered noun. 250 reconstructed IDs, 78/78 schema probe, hybrid C+D (one operator; taxonomy as eval). v0.3 does not reopen that. It supplies the missing cabinet: routing, slot keys, DATE fold, `i326` hole. The 15-lens factory on main (`970fb94`) already covers the nouns that pay rent — without those IDs.

### GROK DERIVATION

Read the leaked shirts, not the labels. Trainer→rideshare, care→vehicle, wheelchair→beauty, cooking class→education (then duplicated), MISC residual aliases. That is one operator with ~10 constraint families, not 505 schemas. DATE’s event slots (`date-type, format, date, location, safety, budget`) compile to `find(compatible entities)` — the same op as JOB, RIDESHARE, and agent-delegation. Routing (geo 235 / mixed 198 / network 56 / missing 16) is “does this entity need a city?” Infer it. Do not first-class it.

### DISCOVERED THROUGH IMPLEMENTATION

Live dating already had humans+AIs, sectioned UI, offer↔seek, recursive Who else?, evidence. The catalog had dinner-date enums and a fold. Implementation won. Apartment/rides/jobs/travel/events/agents did not need `i088` / `i138` / `i177` / `i353` / `i400`. `whoelse.find` stayed. This PR does not add a slot schema or a vertical engine.

---

## DATE vs the live dating lens

| | v0.3 DATE (attested) | Live dating lens |
| --- | --- | --- |
| ID | `i308-date` SOCIAL mixed verified **deep** | none |
| Kind | **event** | not a type; humans + AIs in one pool |
| Template | DATE who else? (`date-type, format, date, location, safety, budget`) | free sentence + `offers`/`seeks` + attributes |
| Synonyms | dating, meet someone, romance (folded) | `DATING_LANG` (`date`, `meet`, dinner, mountain bike, thought partner…) |
| UI | unknown (catalog) | **Humans then AIs sectioned**; compatibility seeks |
| Recursion | not in slots | exemplar + Who else? / more-like |
| Evidence | `safety` as a slot | `trust.evidence` + AI disclosure on the entity |
| Fold | DATING ⊂ DATE; `i326` gone | never had two IDs |

**Live dating discovered what the catalog missed:** mixed types, type louder than rank, offer↔seek as complementary match, recursive expansion, evidence/disclosure. It did **not** discover dinner-date enums.

**Verdict:** DATE is an **alias compiling to `find(compatible entities)`**, not a primitive. Keep it as a lens name and synonym family. Do not restore a DATE engine.

**Same matching op?** Dating / JOB / RIDESHARE / agent-delegation — **yes**. One `whoelse.find`. The scary sentence is still “who else can / has / needs this” over a shared entity model.

---

## Routing: geo / mixed / network / missing

| Routing | n | What it meant | Live encoding |
| --- | ---: | --- | --- |
| geo-anchored | 235 | place-bound fulfiller | `city` / `location` / neighborhood; soft-geo so AIs survive |
| mixed | 198 | place + graph (reservation, event, listing) | mixed-type pool; restaurant / DATE / AIRBNB |
| network-routed | 56 | institutional / digital, no required city | BANK, AI TOOLS, agents; omit city |
| missing | 16 | unrouted residual (MISC aliases) | ignore; do not add a `routing` field |

**Keep as first-class in core? No.** Infer from whether entities have `location` and what `type` they are. Routing is a *reading* of the catalog, useful for eval (“did a geo sentence return only locals?”), not a schema column.

---

## Slots → universal constraints (smallest useful set)

| Family | v0.3 examples | Universal |
| --- | --- | --- |
| geo | location, origin, destination, airport | `city`, `neighborhood`, ride `origin`/`destination`, `radiusKm` |
| time | availability, schedule, hours, dates, departure | `availability`, `availableFrom`, soft “next week”, reservation `when` |
| money | budget, price, fees, amount, rate, payment | existing price-key parser |
| party | party-size, travelers, guests, passengers | `seats` / `partySize` |
| diet/item | cuisine, diet, item | attributes + seed vocab |
| property | property-type, amenities | apartment/travel attributes |
| urgency / state | urgency, openNow | `urgency`, `state`, `neq`, `remaining` (count) |
| evidence | trust, licensed, safety, data-policy | `trust.evidence` + attribute |
| eligibility | income, credit, membership, status | CONSTRAINT `eligible` / `income` / `creditScore` / `membership` |
| skill/specialty | specialty, procedure, matter, use-case | `intent` / `offers` |
| type | provider-type, user-type | `type` |
| vibe / format | occasion, format, date-type, preference | **stay in the sentence** |
| reservation / visit | reservation, visit | CONSTRAINT `reservation` / `when` for inventory-at-time; ACTION `book` still not find |
| leaked vehicle/style | trainer origin, wheelchair style | **do not keep** |

Smallest useful set that actually changes candidates: **geo (incl. radiusKm), time, money, party, type, side/roles, evidence, state, eligibility, reservation, remaining.** Everything else can ride in `intent` until a vertical forces a key (apartment already forced bedrooms/pets; rides forced origin/dest).

---

## Catalog roles

| Role | Use? | How |
| --- | --- | --- |
| Test corpus | **Yes** | Probe sentences; do not assert IDs |
| Regression | **Yes** | “dentist still expressible”; seed-miss is OK |
| NL mapping | **Yes, thin** | [`onebox-alias-hints.json`](../legacy/intent-protocol/onebox-alias-hints.json) |
| Vocab | **Yes** | Seed `offers`/`seeks` nouns |
| Seed | **Selective** | Only if a lens needs the words |
| Eval | **Yes** | A/B/C/D labels on this file |
| Production enum | **No** | — |
| Slot schemas / vertical engines | **No** | — |

---

## Subgroup index (compact file)

| IDs (approx) | Subgroup | n | Routing | Deep / notes |
| --- | --- | ---: | --- | --- |
| i001–i036 | BODY & HEALTH | 36 | geo | **DOCTOR** attested |
| i037–i059 | FITNESS & SPORT | 23 | geo | trainer leak |
| i060–i086 | FOOD & DRINK | 27 | mixed | **RESTAURANT** attested; COOKING CLASS #1 |
| i087–i129 | HOME & LIVING | 43 | geo | APARTMENT, PLUMBER attested |
| i130–i156 | TRANSPORT & MOBILITY | 27 | geo | RIDESHARE attested |
| i157–i176 | FINANCE | 20 | network | i157–i170 attested; i171–i176 fill |
| i177–i196 | WORK | 20 | mixed | fill (PR #5 JOB spine) |
| i197–i219 | EDUCATION | 23 | mixed | COOKING CLASS #2 |
| i220–i244 | CULTURE | 25 | mixed | fill |
| i245–i262 | FAMILY | 18 | geo | fill |
| i263–i278 | BEAUTY | 16 | geo | wheelchair-template source |
| i279–i293 | PETS | 15 | geo | fill |
| i294–i307 | FASHION | 14 | mixed | fill |
| i308–i325, i327–i334 | SOCIAL & COMMUNITY | 26 | mixed | **DATE** attested; **skip i326** |
| i335–i352 | ENV | 18 | geo | fill |
| i353–i368 | TRAVEL | 16 | mixed/geo | **AIRBNB** fill-deep |
| i369–i384 | CREATIVE | 16 | mixed | fill |
| i385–i399 | LEGAL | 15 | mixed | **LAWYER** fill-deep |
| i400–i419 | DIGITAL & TECH | 20 | network | **AI TOOLS** attested (`n=399`) |
| i420–i441 | EVENTS | 22 | mixed | fill |
| i442–i461 | LOCAL | 20 | geo | fill |
| i462–i506 | MISC | 45 | missing/network/geo | residual aliases |

Attested source count: **172**. Fill: **333**. Treat fill IDs as eval fixtures, not SHA-stable production keys.

---

## Architecture to ship (and not ship)

**Ship (already shipped; this PR only documents):**

- One operator: `WHOELSE` / `whoelse.find`
- Human sentence in; ranked entities out
- Open `type`, `offers`/`seeks`, optional exemplar
- Legacy + v0.3 catalog as **eval + evidence**

**Do not ship:**

- A 505 enum in core
- Per-noun routes or slot schemas
- A `routing` column on the matcher
- Editing historical repos
- Treating fill rows as the lost CSV

**Optional thin (this PR):** synonym alias hints for the one-box. Agents skip them.

---

## Verdict

PR #5’s extraordinary claim survives the real IDs: **true at the operator layer, false as a fulfillment story.**

v0.3 is richer evidence for the same collapse, plus a routing axis, a slot-template scandal, and a DATE fold that accidentally agrees with the live dating costume.

What the old catalog already discovered: the breadth of human ask-nouns, geo/mixed/network, a handful of real constraint roles, and that Dating is DATE.

What we compress into the WhoElse primitive: **almost all of it** — `whoelse.find` + a dozen constraint families + four network verbs.

Catalog = human expression. Protocol = machine exchange. Keep both. Import neither as ontology.
