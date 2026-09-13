# WhoElse discoveries

Implementation notes from building the first working discovery engine on top of the existing who else? brand. Not a pitch.

---

## TOBIAS HYPOTHESIS

The bet that dating is the right *costume* for a generic operator, not a category app.

- **Profiles of desire → pool → match** is already how people understand “find me another.” Romance is one predicate. Collaboration, rides, and permits use the same verb.
- **`who else?` is the product**, not a filter chip. If the primary button is swipe, you have built Tinder-with-bots. If the primary button is Who else?, the object is an exemplar plus a desire, and recursion is free.
- **Humans and AIs in one pool only works if type is louder than rank.** A better-scoring AI that looks like a person is a trust failure, not a ranking win. Sectioned results (Humans, then AIs) are a hypothesis that *clarity beats interleaved relevance* at first contact.
- **The Intent Namespace story is downstream.** You do not need a shared encoding on day one to feel the operator. You need a seed that clusters, a recursive action, and honest labels. The encoding (`VOICE NETWORK who else?`) can stay a landing-page metaphor until a second vertical forces it.
- **MCP is the second client, not a garnish.** If Claude can call `whoelse_find` and get the same JSON the web app renders, the product is a layer. If the web app has a private matcher, it is another silo.

**Doctrine:** Humans ask Who Else. Agents call WhoElse. Same network.

Two surfaces, one network — already true in this repo:

- **Human surface:** Next.js “Who else?” dating client. No MCP literacy required.
- **Machine surface:** `whoelse_find` (plus more_like / explain / feedback). Domain-agnostic tool text. Dating is the seeded dataset, not the tool contract.

What we built to test it: an open-ended `Entity.type`, first-class `offers` / `seeks`, `WHOELSE(context, predicate?, constraints?, exclude?, mode?)`, four MCP tools, a thin HTTP wrapper, and a UI whose only primary CTA is **Who else?**

The reusable mapping we are testing (not a platform we are building):

| Dating now | Agent later | Field |
| --- | --- | --- |
| profile | identity | entity |
| personality / skills | capability | `offers` |
| looking for | request / need | `seeks` |
| match | match | WHOELSE |
| “do I trust this person” | reputation / verify | `trust` stub |
| chat / interest | execution / delegate | client stubs only |

---

## GROK DISCOVERY

Things that became obvious only after ranking real (synthetic) profiles, not slides.

- **First-five quality is mostly seed craft.** TF-IDF + Jaccard is “dumb” and still returns Sam / Leo / Nia / Handoff / Open Voice Router for a voice-network query *if those people say “voice assistants” in overlapping words*. A clever ranker on a vague seed feels worse than a plain ranker on a clustered seed.
- **AIs need capability nouns that match human interest nouns.** “Trail Conditions Bot” only surfaces next to Jordan when both mention mountain biking. Skill menus (“routing”, “DSP”) do not match desire language (“who else wants to ride”). Align the *vocabulary of want* across types.
- **Recursive WhoElse is a different query than “more like this.”**
  - *Who else?* = this card is the new exemplar (expand). The original sentence can be discarded.
  - *More like this* = keep the desire, bias toward peers of this card.
  - Collapsing them made the trail feel random. Splitting them made the trail feel like a conversation.
- **“Near me” is a product decision disguised as NLP.** In this seed it means Washington, DC. Soft-filtering humans by city while *keeping* AIs is the only way a local ride query still shows Trail Conditions Bot. Hard geo-filter hides the agent economy the landing promises.
- **Explanations fail when they restate the bio.** “Why” has to name *overlap with the query* (shared phrases, city, capability). “Surprising difference” has to name something the query did *not* ask for — including, for AIs, the fact of being AI. That difference is a feature, not a footnote.
- **Optional LLM rerank is a spice, not a kitchen.** If the local top-5 are already in-cluster, an LLM can write better sentences. If they are not, rerank cannot invent the missing people. Ship the local engine first; treat `OPENAI_API_KEY` as a progressive enhancement.
- **Swipe-shaped chrome fights the operator.** Even a tasteful card stack invites “next” instead of “else.” A big question, one coral button, and section titles did more for product identity than any badge.

---

## DISCOVERED THROUGH IMPLEMENTATION

Concrete things the code taught us. Reversible.

1. **Generic entity + dating-in-attributes is not a slogan — it removes a class of bugs.** There is no `DatingProfile` type. The ranker never imports romance. A second vertical can load a different `seed.json` without forking `packages/core`.
2. **Monorepo boundary that actually matters:** `@whoelse/core` is the only place that knows how to score. MCP tools and Next route handlers are JSON adapters. When we almost put ranking in an API route “just for now,” explanations and MCP would have drifted in a day.
3. **TF-IDF wants bigrams.** “voice” + “assistants” as a phrase beats either token. Unigrams alone ranked jazz-piano Theo into voice-network results via weak “software” overlap. Bigrams fixed the first-five feel without embeddings.
4. **`exclude` is load-bearing — and easy to overdo.** Always exclude the exemplar or Sam comes back as #1. Do **not** exclude the whole session `seen` list on recursive WhoElse: that hid Nia and Leo (the actual voice cluster) and left leftovers like Jonah. `seen` is for repeating the *same* free-text query. A new exemplar resets the neighborhood.
5. **Mode inference is easy to overfit.** `instead of` → substitute is reliable. Treating *any* exemplar as `peers` is not — it hid AIs after a human card. Dating default stays `expand` unless the user says peers / colleagues / instead.
6. **Feedback has to be query-weighted.** A global “less like Maya” poisons housing *and* dinner-walk queries. Same-query events get a heavier penalty. This is still in-memory and still too small, but the shape is right.
7. **Disclosure has to live on the entity, not the stylesheet.** `metadata.aiDisclosure` and `metadata.demoLabel` travel through MCP, HTTP, and cards. If a future mixed-rank view drops section headers, the badge and the sentence still say AI / synthetic.
8. **Chat stubs leak product truth.** An AI chat that never says “I am an AI” trains the wrong expectation even in a demo. The stub opens with a disclosure. Human “chat” is not a chat — it is an interest record — so the toast says nothing was sent.
9. **Seed path resolution is an ops problem.** Next’s cwd is `packages/web`; MCP’s is `packages/mcp-server`. Walking up to `data/seed.json` (or `WHOELSE_SEED_PATH`) is why `pnpm dev` and `pnpm mcp` both work from the repo root *and* from a package directory.
10. **Existing landing is a second, dumber matcher.** We left the chip-demo in `landing/index.html` as story, and pointed the primary CTA at the real app. Deleting it would have erased the metaphor; keeping it without a link would have stranded testers in a fake.
11. **“Agents” is not a type word.** Sam’s interest in “federated agents” was inferred as `constraints.type = ai`, so recursive WhoElse on a human returned only bots. The AI regex now wants `AI` / `bot` / `LLM` / `artificial intelligence`, not the word *agent*. Same lesson as seed craft: the vocabulary of the agent economy collides with type filters.
12. **Exemplar queries must not dump every attribute.** Stringifying `lookingFor` / `collaborator` pulled Maya and Chris into “more like Sam.” Query text for recursion is now name + description + interests/skills/occupation/capabilities. Structured weight also goes up when an exemplar is present.
13. **Next.js will not resolve NodeNext `.js` specifiers in a workspace TypeScript package.** `extensionAlias: { ".js": [".ts", ".js"] }` was the smallest reversible fix; compiling core to `dist` is the alternative.
14. **`offers` / `seeks` made complementary match cheap.** A dinner-walk human *seeks* a date; Plan-a-Date Bot *offers* an itinerary. A founder *seeks* a thought partner; FounderBot *offers* pitch critique. Same score term will later match “I need a PDF summary” to an agent that *offers* summarization. Dating did not need a `lookingForRelationship` top-level field.
15. **Open `type` plus a reserved list is enough.** Seeded `human` \| `ai`. Reserved `agent` \| `service` \| `company` \| `product` \| `dataset` \| `resource`. Capability queries (`summarize this PDF`, `translate German`) hit `type: agent` rows. Housing/ride queries hit thin `resource` / `service` stubs. The dating UI still sections Humans then AIs and only shows “Also in the network” when another type appears — so the consumer surface stays a dating app.
16. **Agents are entities, not just API clients.** If WhoElse is only a tool agents *call*, it is a gateway. If agents are also *in the pool* (identity, offers, seeks, availability, stub pricing/latency), one agent can ask “who else can do this?” and get other agents. We seeded that shape. We did not seed a reputation market.
17. **`whoelse.find` is the machine verb.** more_like and explain were extra names for the same engine call. Folding them (`entityId` + per-match `why` / `next`) made the MCP surface match the doctrine: one find, optional feedback. Underscore alias kept for clients that reject dots.
18. **First-five dogfood after merge:** a 0.04 type-only floor filled generic queries with Maya/Sam. Query-shaped offers (`who else should I delegate to`) and unstopped `should`/`can`/`likes` leaked Hand-off into dating and Maya into cycling. Fix was stopwords + drop near-zero scores + add `cycling` to the bike cluster + write Devon/Sasha as the coffee-over-networking builders. Human type-bag `person` plus “not a person” AI copy made more-like-Nova share `person` with every human — dropped `person` from the type bag and rewrote those lines. `meet` only hit Nia/Jordan until a few dating-forward humans sought `people to meet`. Political disagreement stays empty — we will not invent politics to fake MAGIC.
19. **Remote MCP is a transport, not a second matcher.** Stdio and `POST /api/mcp` both call `createWhoElseMcpServer(engine)` on the same `WhoElseEngine.fromEntities(seed)`. If ranking lived in the route handler, HTTP and stdio would drift in a day. Stateless Streamable HTTP + `enableJsonResponse` is what Vercel can run; long-lived SSE was the fragile option we skipped.
20. **Universal predicates still hold over HTTP.** The same `whoelse.find` intent string returns Summarizer / Browsewright / Checkmate / Understudy / Nova-cluster / Tobias-meet-startup humans / apartment / ride. Type is an open string; the ranker does not fork for “agent discovery” vs “dating.”
21. **`next.action: invoke` is a new primitive, still a stub.** Agents now carry `apiEndpoint` / `mcpEndpoint` / `authRequirements`. Discover → `POST /api/agents/:id/invoke` → structured “I would do X.” That proves connect/delegate without a runtime, payments, or reputation. Schema break we accepted: machine `attributes` grew endpoint fields; `next.via` moved from `/api/chat` to the invoke path for `type=agent`.
22. **Agent vs human discovery is vocabulary, not architecture.** “Summarize this PDF” never needed a capability registry — the seed offers the phrase. “Tobias meet AI startups” is still TF-IDF on human bios. Ranking across types stays one score; the UI still sections Humans / AIs / Also in the network so type stays louder than rank.

## APARTMENT VERTICAL — second costume, same operator

Dating asked: *Who else should I meet?*
Apartment asks both: *Who else has the apartment I need?* and *Who else needs the apartment I have?*

Built without a second architecture. Same `@whoelse/core`, same `whoelse.find`, same seed pool, a second UI costume. Listings are `type: resource` with domain keys in `attributes`. Seekers are `type: human` with `attributes.role = "seeker"` and a loud `metadata.demoLabel`. No scrapes.

### Dating vs Apartment

| | Dating | Apartment |
| --- | --- | --- |
| Human question | Who else should I meet? | Who else has this? **and** Who else needs this? |
| Entity | profile | listing **or** seeker |
| Offers | skills / presence | apartment, 1-bedroom, pets allowed… **or** tenant / references |
| Seeks | collaborator / date | tenant **or** furnished 1-bedroom in Berlin |
| Constraints that mattered | city, type, mode | city, neighborhood, **generic attribute filters** (rent, bedrooms, pets, furnished, dates), **side** |
| Rank feel | TF-IDF cluster + type sectioning | same score, plus hard attribute gates so $3,100 Williamsburg cannot beat “under $2,500” |
| MCP | `whoelse.find` | `whoelse.find` — no `apartment.find` |

### 1. Universal fields

These stayed enough:

`id`, `type`, `name`, `description`, `offers`, `seeks`, `attributes`, `preferences`, `availability`, `location`, `metadata`, `provenance`, `trust`.

Apartment did **not** add `ApartmentListing` or `lookingForRelationship`. It added keys inside `attributes`: `role`, `bedrooms`, `rent` / `budget`, `currency`, `furnished`, `pets`, `availableFrom` / `availableTo`, `neighborhood`, `listingKind`, `durationMonths`. Those keys are reusable (a ride can have `price` + `availableFrom`; a job can have `budget`).

Schema additions that *were* required, all generic:

- `WhoElseConstraints.side`: `"offer" | "seek"`
- `WhoElseConstraints.attributes`: `{ key, op, value }[]` (`eq` / `lte` / `gte` / `includes` / `truthy`)
- `WhoElseConstraints.neighborhood`
- NL parser emits those from “under $2,500”, “1-bedroom”, “near Georgetown”, “who else needs…”
- MCP `whoelse.find` gained optional `side` (still inferred from intent)
- Machine match `attributes` now pass through the same marketplace keys so agents see rent/bedrooms/pets

### 2. Entity data vs relations vs constraints

Three layers, same as dating, louder here:

- **Entity data** — the listing *is* a 1-bedroom in Georgetown for $2,450. Stored on the entity.
- **Relations (offers ↔ seeks)** — the listing *offers* the apartment and *seeks* a tenant. The seeker is the complement. This is how reverse works without a join table.
- **Constraints** — “under $2,500”, “pets”, “next month” are filters on attributes, not new operators. TF-IDF alone will happily rank a $3,100 loft as “1-bedroom apartment”. Hard `lte`/`eq` is what made the first-five honest.

Dating mostly lived in the first two layers. Apartment forced the third. The third is still generic.

### 3. Is offer/seek fundamental?

**Yes.** This is the deeper marketplace primitive.

Dating hid it: both sides are people, and “I offer presence / I seek a date” reads as personality. Apartment cannot hide it. A listing that only *offers* and a seeker that only *seeks* are different kinds of card, and the interesting question is the reverse one:

> Who else needs what I have?

That sentence is not housing-specific. It is the matching-network sentence:

| Vertical | I have | Who else needs this? |
| --- | --- | --- |
| Apartment | a 1-bedroom in Georgetown | renters whose seeks overlap |
| Rides | a seat to Moab Saturday | passengers |
| Jobs | a role / a skill | applicants / hiring managers |
| Products | a drill / a sofa | buyers |
| Agents | PDF summarization | callers with that seek |
| Compute | spare GPU hours | jobs that seek GPU |
| Capital | a check | founders who seek funding |

`side` on the query is the missing switch. When the human says “I have…”, the query is an **offer** and results must be **seekers**. When they say “Who else has…”, the query is a **seek** and results must be **offers**. Complementary Jaccard was already in the ranker; without `side` it could not decide which direction to prefer, and listings leaked into “who else needs”.

`attributes.role = listing | seeker` is the data-side twin of `side`. Dating entities omit `role` and pass through both directions — so the dating costume does not break.

### 4. Ranking differences

What had to change in core (not an apartment endpoint):

1. **Attribute gates.** Price / bedrooms / pets / furnished / availability / currency parse from NL into generic constraints and **hard-filter**. Soft TF-IDF is not enough once numbers exist.
2. **`side` filter + weight.** `role=seeker` dropped on offer queries; `role=listing` dropped on seek queries. Complement weight goes up when `side` is set.
3. **Neighborhood as a place, not a city.** “Near Georgetown” is not `city=Georgetown`. Places are derived from `attributes.neighborhood` + `location.city`.
4. **Cheaper-than-exemplar.** “but cheaper” + an exemplar writes `rent lte exemplar.rent - 1`. Recursive WhoElse already had the exemplar; this is one more generic op.
5. **Query-as-offer vs query-as-seek.** `emptyEntity` puts the sentence on `offers` when `side=seek` (I have X) and on `seeks` otherwise.

What did **not** change: TF-IDF, modes (`expand` / `peers` / `substitute`), exclude, feedback, MCP tool name, HTTP paths.

Dating first-five stayed a cluster test. Apartment listings do not mention voice assistants, so they do not flood “Who else wants to build a network of voice assistants?”

### 5. One MCP schema for both?

**Yes.** `whoelse.find({ intent })` is enough.

```
intent: "Who else has a furnished apartment in Berlin under €2000?"
intent: "Who else is looking for a 2-bedroom in DC?"
intent: "Who else might be a good tenant for this listing?" + entityId
```

Optional `side` is a hint, not a second tool. Structured `attributes` on the match (rent, bedrooms, pets, neighborhood…) are additive passthrough. Clients that ignored them still get `id / type / name / score / why / next`.

A dedicated `apartment.find` would have proved the opposite of the thesis.

### 6. What breaks?

- **Synonyms still lose.** “flat” vs “apartment”, “allow cats” vs `pets: true`, unless the seed says both.
- **Currency is not converted.** `$2500` will not include a €2400 Mitte listing. Honest for a demo; wrong for a product.
- **Hard filters drop entities missing the key.** A dating human has no `bedrooms`, so they correctly vanish from “1-bedroom under $2500”. A listing that forgot `pets` vanishes from “accepts pets”. Sparse data is punished.
- **“Near Georgetown” is soft-same-city.** Foggy Bottom can appear. That is a product choice, not a geo index.
- **Availability is ISO string compare**, not a calendar. “Next month” means `availableFrom <= end-of-next-month` in UTC.
- **Seekers are `type: human`.** The dating UI must keep them out of the Humans section (`metadata.vertical === "apartment"`) or they look like dates. Type stayed open; the costume has to stay honest.
- **In-memory feedback** still dies on Vercel isolates.
- **No booking, no identity, no scrape.** If someone treats DEMO cards as inventory, that is a disclosure failure, not a matcher failure.

### Recommended third vertical (do not build)

**Jobs / gigs** — built next. See **JOBS VERTICAL** below. Apartment reverse still holds.

---

## JOBS VERTICAL — third costume, same operator (PRODUCTION)

Dating asked: *Who else should I meet?*
Apartment asked both: *Who else has this?* and *Who else needs this?*
Jobs asks both **and** a harder sentence: *Who else can do this work?* where the doer may be a human, a company, an AI agent, or a hybrid.

Built without a second architecture. Same `@whoelse/core`, same `whoelse.find`, same seed pool. No `jobs.find`.

### Forced to add (generic — not job types)

- `WhoElseConstraints.roles` — marketplace role keep-list (`opening` / `employer` / `worker` / `applicant` / `driver` / `passenger` / `provider` / `client`). Same switch apartment used as `listing`/`seeker`.
- `AttributeOp.neq` — rides have changing `state` (`open` / `full` / `departing` / `completed`). “Who else can give me a ride” drops `completed`.
- Price parse now picks a **key** (`rent` / `rate` / `price` / `budget`) from vocabulary. Apartment `$2500` stays `rent`. Gigs `$5000` become `rate`.
- `durationWeeks`, `start=immediate`, `licensed`, `urgency`, `origin`, `destination`, `seats` — all generic attribute keys.
- `trust.evidence` — `{ verified, verifiedBy, portfolio, outcomes, licenses, references }`. Status may be `evidence`. Not a score, not a market.
- `inferredVertical` — costume hint from language. **Does not switch the matcher.** Tabs stay user-chosen.

### Universal (still enough)

`id`, `type`, `name`, `description`, `offers`, `seeks`, `attributes`, `preferences`, `availability`, `location`, `metadata`, `provenance`, `trust`.

Job openings are **not a new type**. They are `type: resource` + `attributes.role = opening` + `attributes.owner = company-id` — the apartment listing pattern. Employers also carry the role as an offer on the company entity (`role: employer`). We seeded **both** on purpose.

### Domain-specific (keys only)

`roleTitle`, `rate`, `salary`, `durationWeeks`, `start`, `fallbackTo`, `latencyMs`, `priceUsd`. Living in `attributes`. The ranker does not import “job”.

### Dating vs Jobs

| | Dating | Jobs |
| --- | --- | --- |
| Human question | Who else should I meet? | Who else is hiring? **and** Who else can do this work? |
| Entity | profile | employer / opening / worker / applicant / agent-as-worker |
| Offers | skills / presence | a role **or** labor / capability |
| Seeks | collaborator / date | a worker **or** a role |
| Rank feel | sectioned Humans then AIs | **mixed score** — type on the badge |
| MCP | `whoelse.find` | `whoelse.find` — no `jobs.find` |

### Is a job opening an entity or an offer?

**Both, and that is the finding.** Prefer offer/seek on entities.

- **Offer attached to a company** (`role: employer`) wins for “Who else should I recruit?” / org-level sentences. The company *is* the entity; the opening is vocabulary on `offers`.
- **Opening as an entity** (`role: opening`, `owner` → company) wins for reverse: “Who else needs this role?” / “Who else might be a good hire for this opening?” — same reason apartment listings are entities.

We did **not** invent `JobOpening` as a type. `resource` + `role` was enough. If we had only companies, reverse matching lost a handle. If we had only openings, “who else is hiring” still worked but felt like a listings grid.

### Task vs job

**They collapse.** Hire-human / delegate-to-AI / call-MCP / contract-company is one operator:

> Find an entity capable of outcome X under constraints C.

Evidence: `Who else can do this work for under $5,000?` returns `role: worker` across `human`, `company` (vendor), and `agent` in the same first eight. Constraints (`rate lte 5000`) are generic. The client decides chat vs invoke vs stub interest. The engine does not.

What does **not** collapse: dating still needs type louder than rank. Jobs can interleave because the user is asking for an *outcome*, not a *person to meet*.

### Trust / evidence / verification / reputation

They are **different**. Smallest useful abstraction:

| Word | What we stored | What we refused |
| --- | --- | --- |
| evidence | portfolio links, past-outcome stubs, license strings | a score |
| verification | `verified: true` + `verifiedBy: "demo-stub"` | a verifier network |
| reputation | field left as `unscored-stub` on agents | a market, graph, or leaderboard |
| trust | the existing stub, now able to hold `evidence` | payments, credentials, identity |

“Who else has done this exact kind of work before?” boosts entities that *attached outcomes*, ~0.06–0.16 on the score. That is enough to feel real for a demo hire. It is not enough to be a marketplace.

### Reciprocal matching

First-class on every non-dating costume: **Who else needs this?** / **Who else has this?** Jobs needed it more than apartments because the same human is often *both* a worker (offers labor) and an applicant (seeks a role). `roles` is what keeps “hiring” from returning applicants and “looking for a role” from returning openings. Complementary Jaccard was already there; `roles` is the missing switch that `side` alone could not be — because jobs have **two** markets on one entity (job market vs labor market).

### NL vs mode tabs

NL **can** infer vertical (`inferVertical`) and side/roles. We **do not auto-switch tabs**. Auto-switch would fight the costume (a dating query typed on Jobs would jump away) and leak job humans into the dating Humans section. Result: tabs are costumes; the pool is shared; the meta line says `NL reads as jobs` when language and tab disagree.

### What broke / what we removed

- **`people` as a type lock.** “Hiring AI people in Washington” inferred `type=human` and emptied the opening/employer pool. Lookbehind + hire-language exception.
- **`someone` as a type lock.** “Needs someone with my background” hid companies. Same class of bug as apartment “agent” ≠ type=ai.
- **Price key defaulting to `rent`.** Gig `$5000` would have filtered apartments and missed `rate`. Vocabulary picks the key; aliases do **not** map `rate` ↔ `rent`.
- **ReDoS.** `from .+ to` on ride language hung a hiring query for minutes. Bounded token pattern now.
- **Nothing removed from dating/apartment.** Sectioned Humans→AIs and listing/seeker reverse are unchanged. Job humans are tagged `metadata.vertical=jobs` and stay out of the dating Humans section.

### What each vertical taught

- **Jobs** taught the two-market problem (job vs labor) and forced `roles`. Forced trust to become evidence. Forced mixed rank.
- **Rides** taught **state**. An offer that was true this morning can be `full` or `completed`. Apartment availability was a date string; rides need a discrete state.
- **Services** taught **license as evidence, not a type**. Unlicensed cheaper vs licensed emergency is a trust contrast, not `type: plumber`.
- **Agents** taught fallback is just another offer (`fallbackTo` + Understudy/FallbackCoder) discovered by the same `whoelse.find`. Delegation is a sentence, not a runtime.

### Where the abstraction breaks

- Currency still not converted.
- Synonyms still lose (“fullstack” vs “full stack”) unless the seed says both.
- `roles` hard-filter drops a capable agent that forgot `role: worker`. Sparse data is punished — same as apartment `pets`.
- Two-market entities (freelancer = worker + applicant) cannot be both sides of one query. We pick from language. That is honest and lossy.
- Mixed rank on dating still feels like a trust failure. Do not generalize jobs interleaving backward.
- STATE is an attribute, not a first-class timeline. No calendar, no seat hold, no booking.
- ACTION is still `next.action` stubs (`invoke` / `chat` / `record_interest` / `open`). Find does not fulfill.
- RELATION is `attributes.owner`. Not a graph. Enough for “this opening belongs to Northwind.”
- Products / Experts remain eval-only stubs (`eval-product-drill`, `eval-expert-notary`). No UI.

---

## RIDES (experimental slice)

Same operator. `role: driver | passenger`. `origin`, `destination`, `seats`, `state`, `price`. Synthetic only. Legacy `service-dc-ride` was patched into this shape so “Who else can give me a ride?” did not need a new tool.

Changing state is the new primitive. `neq completed` is generic. A full ride still appears (state is visible on the card) so the costume can show that the world moved.

## SERVICES (experimental slice)

Same operator. `role: provider | client`. `trade`, `licensed`, `urgency`, `rate`. License lives on `trust.evidence.licenses`. The unlicensed cheap card is labeled DEMO and is a contrast, not inventory.

## AGENTS / MCP (deepened, not a new app)

Existing nine agents gained `latencyMs`, `priceUsd`, `reliability` (0–1 stub), `fallbackTo`, `delegation: "whoelse.find"`. New job-capable workers (CodeSmith, Gigwright, Reviewer, HireScout, PairCoder, ImmediateBot, BudgetCoder, DomainHopper, FallbackCoder) sit in the same pool with `role: worker`. Invoke stubs expanded. Still one tool.

---

### GROK (this phase)

- Jobs is where offer/seek stops being a housing trick and becomes the product. The scary sentence is not “who else is hiring.” It is “who else can do this work” with humans and AIs in one list and the badge doing the trust work dating refused to skip.
- `roles` is more load-bearing than `side` once one entity participates in two markets.
- Evidence fields changed the *feel* of a hire query more than any ranker tweak. Drew Ibarra exists because the seed says “done this exact kind of work,” and `trust.evidence.outcomes` makes the why-line honest.
- NL vertical inference works on the example set and must not drive navigation. The costume is a promise to the human, not a filter the engine needs.

### TOBIAS (this phase)

The hierarchy held: one core, one `whoelse.find`, many domains. Jobs is the production costume. Rides/services/agents are slices in the same repo, same PR, same schema. Reciprocal discovery is now a button on every non-dating card. Trust started small and stayed small.

### IMPLEMENTATION (this phase)

23. **`roles` is the jobs-shaped twin of apartment `side`.** `side` still drops seeker↔listing families. `roles` names which family you meant when both families are offer-shaped (hiring vs can-do-work).
24. **Openings as `resource` + `role: opening` + `owner`.** Not a type. Reverse works. Companies still exist as employers.
25. **Heterogeneous rank is a UI choice, not an engine fork.** The engine already returned one scored list. Dating sections it. Jobs does not.
26. **Agent deepening is attributes, not a capability registry.** `fallbackTo` is data. “Who else can take over if CodeSmith fails?” is `whoelse.find`.
27. **Seed generator is idempotent** (`scripts/generate-vertical-seeds.ts`, `metadata.scale = 2026-verticals`). Re-run does not duplicate.

---

### Open questions we would run next

- Mixed rank vs sectioned rank: does anyone mis-read an AI as a human when the badge is present but the list is interleaved?
- Embeddings vs TF-IDF on the *same* 34 entities — where do synonyms break?
- Persist MCP feedback across Vercel isolates (today each request is a new process-local store).
- Separate Node host (Fly/Railway) only if Streamable HTTP on Vercel starts dropping sessions; stateless JSON is the current bet.

---

## UNIVERSAL LEAP — what the code forced (not a roadmap)

Costume tabs stayed for comparison. No new verticals. One box at `/universal`. Agents register and delegate on the same engine.

### 1. Proposed primitive model

**Kept as first-class (`UNIVERSAL_PRIMITIVES`):**

| Primitive | What it is | What it is not |
| --- | --- | --- |
| **ENTITY** | Open `type` + name + offers/seeks + attributes | A dating profile type, a JobOpening type |
| **OFFER / SEEK** | First-class records on every entity (`publications[]`); string bags are derived; `side` picks direction | Separate listing/job/ride engines |
| **CONSTRAINT** | Generic `{key, op, value}` hard filters | Per-vertical query languages |
| **EVIDENCE** | Composable artifacts (verified, portfolio, outcomes, licenses, receipts) | A trust score or reputation market |
| **ACTION** | `endpoint` / invoke / `next.action` | Fulfillment, booking, payments |
| **MATCH** | Durable `match_id` + seek/offer + status + optional receipt | A second finder (`match` instead of `find`) |

**Derived, not promoted to a second core:**

- **RELATION** = `attributes.owner` / `fallbackTo`. Enough for “this opening belongs to Northwind” and “if CodeSmith fails → FallbackCoder”. Not a graph database.
- **STATE** = `attributes.state` + `neq`. Enough for rides. Not a calendar.
- **VIEW** = `inferVertical` / `inferredView`. Presentation costume. The ranker does not fork on it.

**Deleted as unnecessary (were hypotheses, not missing types):**

- Separate `listing` / `job opening` / `ride` entity types — they are **offers on entities** (`resource` + `role`).
- `datingEngine` / `jobsEngine` / `apartmentEngine` — never existed; tests assert they still do not.
- A magical `trustScore` — refused again. Artifacts only.
- Vertical MCP tools — `jobs.find` still does not exist. Added `whoelse.register` / `whoelse.invoke` / `whoelse.delegate` as **network verbs**, not costumes.

**Added only because production evidence demanded it:**

- `UniversalQuery` — NL → side, roles, hard constraints, soft prefs, evidence needs, state, view. The costumes already emitted this; naming it stopped the parser from being “a pile of regexes that secretly know dating.”
- `whoelse.register` — an agent is an entity. Publishing one is `store.add` + TF-IDF reindex. Process-local on Vercel.
- `whoelse.delegate` — find → select (first/cheapest/fastest/evidence) → invoke → receipt → match record. The A→B demo is this function, not a slide.
- `MatchRecord` + `InvokeReceipt` — cheap to store because find already had two ids and a why. Status: proposed → invoked → verified.

### 2–6. Demos the code actually runs

- **One-box:** `/universal`. No required category. “I need someone who can redesign my website next week for under $2,000.” parses as `side=offer`, `roles=worker`, `rate lte 2000`, soft `next week`, type **open**. Mixed human / company / AI. Costume tabs remain on `/`.
- **Reciprocal:** `engine.reciprocal(entityId)` flips SEEK↔OFFER. Georgetown listing ↔ Priya/Nora/Marcus. Same call for a job opening, a ride, a service, an agent. Writes a `MatchRecord` proposed.
- **Register:** MCP `whoelse.register` or `POST /api/register`. Then `whoelse.find` sees the new row on that isolate.
- **A→B:** ClaimWriter invoke returns `cannot: ["verify"]` → `whoelse.find("Who else can verify this result?")` → Checkmate → invoke → receipt with `verified` + outcome stub. UI: `/ais` “Run A → B demo”. MCP: `whoelse.delegate`.
- **Trust:** `explainTrust(entity)` lists artifacts. Cards ask “Why should I trust this?” and print licenses/outcomes/verified-by — never a number.

### 7. What broke / what failed

- **“Next week” cannot be a hard `start` gate.** Sparse `start` fields emptied the pool. It is a soft label. Availability is still not a calendar.
- **`need someone` was hire language.** “I need someone who can redesign…” used to infer `roles=opening/employer` and `type=human`. Split: `someone who can` = worker/offer; `needs someone with` = hire.
- **Price key defaulted to `rent`.** A website sentence without “job/work/coding” would have filtered apartments. Vocabulary now includes `website|redesign|who can` → `rate`.
- **Register does not survive Vercel isolate churn.** Honest. Same as feedback. Not a marketplace.
- **Invoke is still a stub runtime.** The *flow* is real (find, choose, call, receipt). The *work* is “I would do X.” WhoElse owns discovery + selection + evidence of the handoff, not execution quality.
- **Legacy 506:** still one operator. Most nouns are unseeded. Collapse is `find + constraints`, not 506 tools. See `docs/universal-collapse.json` after `npx tsx scripts/universal-collapse.ts`.

### 8. Independent discoveries

28. **The universal object is the query, not a new entity type.** Entities were already generic. What the core secretly knew was *how to read a sentence*. `UniversalQuery` is the thing that made “no category” possible without a second matcher.
29. **Find is still the verb.** `match` is a *record* of a find (and optional invoke). Renaming the tool to `whoelse.match` would pretend fulfillment. We did not rename.
30. **One-box works when seed vocabulary overlaps the sentence.** The website demo is TF-IDF on “redesign my website” plus a rate gate — same lesson as voice-assistants. The leap did not invent embeddings.
31. **Selection criteria are cheap once attributes exist.** `cheapest` / `fastest` / `evidence` are sorts on `priceUsd` / `latencyMs` / evidence fields. Permissions are declared, not enforced. That is the honest agent market today.
32. **Dating-for-everything holds as a *question*, not as a *layout*.** The one-box can interleave types. Dating still sections Humans then AIs. The analogy breaks at trust-of-personhood, not at offer/seek.

### 9. What WhoElse is now (one sentence)

**WhoElse is a shared find layer: entities publish what they offer and seek; humans and agents ask `whoelse.find`; the system returns who else matches, why, and optionally a receipt when one agent invokes another.**

### 10. Verdicts (from implementation, not slogans)

**find vs match vs resolve vs connect**

`whoelse.find` is still the right *core primitive*. Implementation: every costume, the one-box, MCP, reciprocal, and A→B all call `WhoElseEngine.whoelse`. `delegate` is find + pick + invoke. `MatchRecord` is persistence of that pick, not a different search. `resolve` would imply a single winner; we return ranked candidates and let the caller choose. `connect` would imply a session; we return `next.action` stubs. Do not rename `find` until WhoElse *settles* a pair and executes the work. It does not.

**“Dating for everything”**

**Survives as the operator, fails as the UI default.** Holds: exemplar + desire, offer/seek, recursive Who else?, one pool of humans and machines. Breaks: dating must keep type louder than rank (a high-scoring AI in a date list is a trust failure); jobs/one-box *want* mixed rank because the user asked for an outcome. Romance-shaped chrome (swipe, “date”) is not the product. The question “Who else?” is.

**“Last marketplace”**

**Less plausible as a place that owns transactions; more plausible as a discovery/match layer other markets call.**

| WhoElse should own | Should not own | Domain-specific | Decentralized |
| --- | --- | --- | --- |
| Find + complementary offer/seek | Booking, payroll, housing law | License strings, bedrooms, seats | Identity, real verification, reputation |
| Constraint parse + evidence artifacts | Inventory truth | Vertical *views* (costume tabs) | Agent endpoints (they bring their own) |
| Match records + invoke receipts | Payments, escrow | Seed vocabulary | Who is allowed to register (today: anyone on the isolate) |

The slogan fails where we would have to become Zillow + LinkedIn + Uber + a runtime. The code refused that. The slogan holds where every one of those still needs the sentence *who else can / has / needs this* over a shared entity model.

### GROK (this leap)

The scary sentence is no longer “add jobs.” It is “do not add a category, and still get a website redesigned under $2,000 by a human, a company, and an AI in one list.” That worked because offer/seek + constraints were already the product. Registration and A→B worked because an agent was already an entity with an endpoint. What we *did not* need: MATCH as a finder, RELATION as a graph, STATE as a platform, or a trust score.

### TOBIAS (this leap)

Verticals can disappear into views. The leftover object is ENTITY with OFFER/SEEK, queried by CONSTRAINT, optionally evidenced, optionally invoked. `whoelse.find` stayed. Production costumes stayed. The one-box is the proof, not a sixth tab.

### IMPLEMENTATION (this leap)

33. `parseUniversal` is the public NL contract; `inferVertical` is a view hint.
34. `EntityStore.add` + index.add = registration. No capability registry.
35. `delegate({from, task, select})` is the A→B demo. Receipts attach to `trust.evidence.receipts`.
36. Costume tabs unchanged. `/universal` is the one-box. `/ais` runs the live A→B.

---

## MARKETPLACE FACTORY — breadth as the test (thin proofs)

Universal leap stayed running. No new core primitive. Ten more lenses on the same `whoelse.find`. Seed ~186 → ~249. Tabs are experimental costumes; the one-box still has no required category.

**Lenses now (15):** Dating, Apt, Jobs, Rides, Services, Products, Experts, Capital, Travel, Events, Childcare, Collab, Compute, Data, Local. Agents remain `/ais`, not a sixteenth matcher.

### Per-vertical notes

| Vertical | New primitive forced? | Existing sufficient? | Broke? | Surprisingly reusable | Same MCP? | Entity type vs offer/seek |
| --- | --- | --- | --- | --- | --- | --- |
| **Products** | No | `price`, `state`, substitute mode | Sold-out must *have* `inStock: false` or it leaks | `equivalent` is just substitute + `kind` | yes | **type `product`** (already reserved) + seller/buyer roles |
| **Experts** | No | offers + `trust.evidence` | “knows about” is vocabulary, not authority | Human vs AI is the dating badge again | yes | offer/seek; role `expert`/`asker` |
| **Capital** | No | price parser + roles | `$250k` was parsed as `$250` until `k` suffix | Ticket size is rent with a different key | yes | offer/seek; role `investor`/`founder` |
| **Travel** | **No — forced reuse** | listing/seeker + rent + city + `availableFrom` | Apartment “room” vs “room tonight” is the gap: nights vs months, not a new type | Georgetown room tonight sits next to Georgetown 1BR | yes | **same as apartment** (`resource` + listing/seeker) |
| **Events** | No | location + complementary offers | `from my city` is a phrase, not a graph | Community is an open `type`, not a primitive | yes | event = resource; speaker/attendee = people |
| **Childcare** | No | evidence + tonight as `when` | Unverified cheaper card is a trust *contrast*, same as unlicensed plumber | Reciprocal = one entity with both offers and seeks | yes | offer/seek; caregiver/parent |
| **Collab** | No | complementary Jaccard | Roles would have stolen jobs (`worker`/`opening`) — dropped them | Multi-party is a project *resource* seeking two crafts | yes | **no role**; offers↔seeks only |
| **Compute** | No | state + price + latency (already on agents) | Busy host still matches unless we hard-filter state | Agent routing is `whoelse.find` + `fallbackTo` | yes | resource + role `compute`/`workload` |
| **Data** | No | reserved `dataset` + evidence provenance | `verify this claim` vs `verify this result` — one letter, two views | Report is `resource` + `kind`, not type `report` | yes | type `dataset` (reserved) + publisher/researcher |
| **Local** | No | geo + state (`openNow`, `deliverToday`) | Overlaps Products on seller/price — correct | Open-now is ride `state` with shop words | yes | company + seller/buyer (same as products) |

### Expansion scorecard

Scores: **5** = reused as-is, **3** = attribute keys only, **1** = new engine temptation we refused, **0** = would have needed a new primitive (none did).

| Lens | Schema | Matcher | MCP | Domain code | New primitive? | Reciprocal? | Trust? | Real-time state? | Human/AI mixed? | Network effects? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dating | 5 | 5 | 5 | UI sectioning | no | weak (same-side people) | type louder than rank | no | sectioned | exemplar trail |
| Apt | 5 | 5 | 5 | attribute keys | no | **yes** listing↔seeker | stub | dates as strings | no | neighborhood vocab |
| Jobs | 5 | 5 | 5 | `roles` | no | **yes** two markets | evidence | start=immediate | **mixed** | company↔opening owner |
| Rides | 5 | 5 | 5 | origin/dest | no | driver↔passenger | stub | **state** | no | seats |
| Services | 5 | 5 | 5 | license key | no | provider↔client | **license evidence** | urgency | no | trade vocab |
| Products | 5 | 5 | 5 | sku/inStock | no | seller↔buyer | stub | **inStock** | agent PriceHop | substitution cluster |
| Experts | 5 | 5 | 5 | domain key | no | expert↔asker | portfolio/license | no | **mixed** | provenance |
| Capital | 5 | 5 | 5 | ticketSize/stage | no | investor↔founder | outcome stub | no | company fund | intro graph is a sentence |
| Travel | 5 | 5 | 5 | durationNights | no | **reuses apt** | stub | tonight=`availableFrom` | no | city overlap with apt |
| Events | 5 | 5 | 5 | eventId | no | speaker↔attendee | stub | when phrase | **1 AI emcee** | “from my city” |
| Childcare | 5 | 5 | 5 | `when=tonight` | no | **yes** + swap entity | **verified vs not** | tonight | AI is a *matcher*, not a sitter | reciprocal swap |
| Collab | 5 | 5 | 5 | craft key | no | complementary only | portfolio | no | **mixed** | multi-party project |
| Compute | 5 | 5 | 5 | gpu/capacity | no | compute↔workload | stub | **busy/available** | **agent router** | fallbackTo |
| Data | 5 | 5 | 5 | access/owner | no | publisher↔researcher | **provenance** | no | **mixed** | original source |
| Local | 5 | 5 | 5 | openNow/deliver | no | seller↔buyer | stub | **open/closed** | no | overlaps products |

Domain-specific code amount: **parse regex + seed + lens chips**. Zero `*Engine` classes. `inferVertical` gained view names only.

### What the factory taught the core

37. **Role strings are domain vocabulary, not primitives.** Adding `seller`/`investor`/`caregiver` did not change `WHOELSE`. Forgetting that, and tagging collab as `worker`, would have poisoned “who else can do this work.”
38. **Travel did not need a type.** The gap it exposed is *duration grain* (`durationNights` vs `durationMonths`) and “tonight” as `availableFrom`, not a hotel object. Georgetown room tonight and Georgetown 1BR share `role=listing`. The costume is what lies.
39. **Products vs Local is one market seen twice.** seller + price + geo + state. Inventory (`inStock`) and shop hours (`openNow`) are the same STATE attribute. Vertical labels are the wrong cut.
40. **`$250k` is a parse bug, not a capital primitive.** Bare `$250` from `$250k` would have matched nothing honest. Suffix `k` is generic.
41. **Meta-query killed the organizing principle.** “I need help understanding this market.” infers **no view** and returns human expert + AI + company + dataset + report + community in one list. The useful object is the *offer* (“help understanding this market”), not the costume.
42. **Reserved types finally earned their keep.** `product` and `dataset` were stubs; they are now seeded. `community` and `report` stayed open strings / `kind` — we did not promote `report` to a core type.
43. **Breadth did not force a primitive.** After 15 lenses the survivor set is still ENTITY, OFFER, SEEK, CONSTRAINT, EVIDENCE, ACTION, MATCH. RELATION/STATE/VIEW remain derived.

### When vertical labels stopped mattering

On the sentence **“I need help understanding this market.”** — no `inferVertical`, mixed types, same `whoelse.find`. Also on travel↔apartment (same listing) and products↔local (same seller). Labels remain useful as *lenses* (chips, banners, DEMO copy) and harmful as *architecture*.

### One-sentence WhoElse (unchanged, now stress-tested)

**WhoElse is a shared find layer: entities publish what they offer and seek; humans and agents ask `whoelse.find`; the system returns who else matches, why, and optionally a receipt when one agent invokes another.**

### Verdicts after breadth

**whoelse.find still right?** Yes. 15 lenses, one-box, MCP, reciprocal, A→B all still call `WhoElseEngine.whoelse`. A `products.find` would have been the tell we failed.

**Dating-for-everything?** Operator yes, layout no — same as the leap. Dating still sections. Factory mixed lists want the badge. Childcare made this sharper: an AI named SitterIndex must not look like a babysitter.

**Last marketplace (own vs not own)?** Breadth makes “own the transactions” *less* plausible. We would now also own inventory truth, background checks, hotel nights, GPU capacity, and dataset licenses. WhoElse should own **find + complementary offer/seek + constraints + evidence artifacts**. It should not own the shops, the kids, the GPUs, or the cap table.

### GROK (factory)

The test was whether the tenth vertical would finally demand a special engine. It did not. The interesting failures were collisions (travel/apt, products/local, `$250` vs `$250k`, collab-as-worker) — evidence the model is *too* reusable, not too thin. When one sentence returns six entity kinds, “vertical” is a filter chip.

### TOBIAS (factory)

Breadth is the test and it held. Keep merging when green. Do not polish these into startups. The leftover question is not “which vertical next” — it is whether anyone will publish *real* offers/seeks onto this find layer.

### IMPLEMENTATION (factory)

44. `scripts/factory-entities.ts` + idempotent merge. Same `scale: 2026-verticals`.
45. `packages/web/src/lib/lenses.ts` is presentation. DiscoverApp no longer hard-codes five costumes.
46. `InferredVertical` grew names. The ranker did not grow methods.
47. Headline demos still green: website one-box, Georgetown reciprocal, register, ClaimWriter→Checkmate receipt. Factory tests + MCP cases sit beside them.

---

## INTENT PROTOCOL v0.3 — archaeology

Production catalog (505). Compact file: `legacy/intent-protocol/`. Review: `docs/INTENT_GRAMMAR_V03_REVIEW.md`. **Not imported into core.** 172 attested recitation rows + 333 fill rows (subgroup counts + PR #5 names). SOCIAL skips `i326`.

### PREVIOUS WHOELSE WORK

PR #5 already collapsed the reconstructed 250 to one `whoelse.find`. That operator claim is unchanged. v0.3 is the *cabinet*: `i001-doctor` IDs, 22 subgroups, geo/mixed/network, slot-key templates, DATE fold. The 15 live lenses already cover the nouns that matter (services, apt, rides, jobs, travel, events, capital, agents) without those IDs.

### GROK DERIVATION

The catalog is a **template cloner**. `{slug}-reason,care-type,payment,visit-mode,availability` mints specialists. COOKING CLASS wears the education shirt in FOOD and is duplicated in EDUCATION. PERSONAL TRAINER wears rideshare. Care nouns wear `vehicle`. WHEELCHAIR wears beauty `style`. Leakage is the collapse proof.

Routing is the adult field: geo = needs a city; mixed = place + graph; network = BANK / AI TOOLS / agents. Infer from seed, do not add a `routing` column.

`MORTGAGE` ×2 (HOME geo vs FINANCE network) is the two-market lesson. `i326` missing after DATE is the fold left a hole — IDs were never a stable API.

**DATE is an alias, not a primitive.** Catalog: event framing, safety/budget/format, Dating ⊂ DATE. Live dating: humans+AIs, sectioned UI, offer↔seek, recursive Who else?, evidence. Dinner-date enums lost. Dating / hiring / rideshare / agent-delegation are one `whoelse.find(compatible entities)`.

**N ≈ 17:** one find + ~12 constraint families + register/invoke/delegate/feedback.

### DISCOVERED THROUGH IMPLEMENTATION

Live factory did not need these IDs. Apartment and rideshare slots are already attributes. Doctor/restaurant/DATE/AIRBNB/LAWYER deep keys are constraint *hints*. Catalog `status` is hygiene, not `trust.evidence`. AI TOOLS vocab (`use-case, integration, pricing, data-policy`) is seed language for MCP capability discovery — agents should skip the alias table and call `whoelse.find` with the task sentence.

### SHARED DERIVATION

Catalog helps humans express (`DATE who else?`, dating/romance synonyms). Protocol lets machines exchange (`whoelse.find` + register/invoke/delegate/feedback). Complementary. Do not unify them by shipping 505 enums. Thin one-box hints live in `legacy/intent-protocol/onebox-alias-hints.json` only.

---

## NETWORK OBJECT — OFFER / SEEK as first-class records (2026-09-13)

Doctrine after catalog lock: WhoElse is a shared find layer. Entities publish OFFER/SEEK. Humans and agents call `whoelse.find`. Lenses are views. The 505 catalog is **vocab/eval, not a runtime enum**.

### DISCOVERED THROUGH IMPLEMENTATION

48. **Bags were the costume; records are the object.** `offers[]` / `seeks[]` were enough to *score* complementary Jaccard. They were not enough to *address* a publication (`id`, constraints, evidence, timestamps). Hydrating bags into `publications[]` on load unified apartment listings, job openings, and agent capabilities without a second engine.
49. **Register was the right verb — once it accepted a SEEK-only agent.** Requiring `offers.min(1)` hid InboxClerk. The contract is now “identity + at least one OFFER and/or SEEK.” Idempotent on `id` (same capability upserts phrases). `whoelse.publish` is the focused attach/update for an entity that already exists.
50. **A find with no lens is the proof.** `Who else can do calendar hold resolution?` infers no view and no roles. Holdwright ranks because its OFFER record capability is in the sentence — not because a `calendar` tab exists. Dating / apt / jobs first-five stayed in-cluster; the new pair does not mention voice assistants.
51. **Catalog IDs must not become `Publication.kind`.** Kind is only `offer` \| `seek`. `DATE` / `i308-date` / `AI TOOLS` stay in `legacy/intent-protocol/` as aliases for humans to start a sentence. Agents skip the alias table and call `whoelse.find({ intent })`.
52. **Find was still an entity ranker.** `matched` pointers were not a pair list. `WhoElseResult.pairs` (and machine `pairs`) is the complementary object: high-confidence OFFER↔SEEK only (score ≥ 0.85). Dating first-five stays entity candidates; it does not mint a pair per dinner-date human.
53. **Requester is the other side of the pair.** `requester` was exclude-only. InboxClerk as requester now supplies its SEEK record, so the pair is clerk SEEK id ↔ Holdwright OFFER id — not `pub-query-seek`. Durable pairs persist as `MatchRecord` with publication ids. Query-synthetic sides are returned but not stored.
54. **Lifecycle is status, not a second graph.** `active` / `withdrawn` / `expired` on the publication. Withdrawn Holdwright OFFER drops out of pairing. Record field is `kind`; query HAS-vs-NEEDS stays `side`.

### SHARED DERIVATION

The leftover network object is:

```
ENTITY  →  publications: [{ id, entityId, kind: offer|seek, capability, status, constraints?, evidence?, created_at }]
whoelse.find  →  candidates[] + pairs[] (OFFER↔SEEK, including requester records)
whoelse.register / whoelse.publish  →  write those records
whoelse.invoke / whoelse.delegate  →  find + invoke + receipt
```

String bags remain a derived view so TF-IDF and old clients do not fork. Lenses remain chips. One-box `/universal` is the same `POST /api/whoelse` path.

Demo: InboxClerk SEEKs `calendar hold resolution` → find (no lens) → Holdwright OFFER → invoke/delegate receipt.

**Do not restore 505 as an API contract. Do not promise 500 marketplaces.**

---

## DURABLE PRINCIPALS — owned writes (2026-09-13)

Launch foundation, not a demo patch. Process-memory remains the ranker; Neon holds principals, ownership, entities, publications, credentials (hash only), and write-audit.

### DISCOVERED THROUGH IMPLEMENTATION

55. **Find staying side-effect free is a product rule, not a missing table.** High-confidence OFFER↔SEEK pairs still return. They do not mint `MatchRecord`s. Durable matches/receipts are deferred — invoke/delegate receipts stay process-local stubs.
56. **Two caller kinds, one ownership row.** Clerk `userId` upserts a human principal. Agent keys are `wek_<id>_<secret>`, stored as SHA-256, rotatable, scoped. Cross-owner is 403; anonymous writes are 401. `requester` on find is an ownership check, not a hint.
57. **Register is create, publish is upsert.** Overwriting an existing id was the isolate-era shortcut. It is now 409. Idempotence lives on `(entityId, kind, capability)` including withdraw. Type `human`/`ai` cannot be spoofed across the human↔agent line; `ai` stays seed/synthetic.
58. **Production-empty is the default.** `WHOELSE_SEED=demo` or `pnpm db:seed` loads labeled fixtures. Auto-loading `seed.json` on Vercel production is forbidden. Local `pnpm dev` still defaults to demo so dating/lenses keep their first-five.
59. **Public DTOs are a strip, not a second entity type.** Preferences, credential fields, and `owner_principal_id` never leave HTTP/MCP find. Marketplace `attributes.owner` (company → opening) stays — that is the graph, not the principal.

### FOLLOW-UP (not this PR)

Durable match/receipt persistence, Clerk production domain, paid plans, ranking rewrite.
