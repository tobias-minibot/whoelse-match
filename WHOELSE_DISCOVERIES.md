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

**Jobs / gigs** — “Who else is hiring for this?” and “Who else can do this work?” Humans on *both* sides, time windows, a budget/salary number, and the first place `trust` stops being a stub. Rides are already a one-row tease; jobs would stress offer/seek harder than housing because the “listing” is also a person. Compute/GPU is the agent-native version of the same sentence. Do not build it until this apartment reverse still feels obvious in production.

---

### Open questions we would run next

- Mixed rank vs sectioned rank: does anyone mis-read an AI as a human when the badge is present but the list is interleaved?
- Embeddings vs TF-IDF on the *same* 34 entities — where do synonyms break?
- Persist MCP feedback across Vercel isolates (today each request is a new process-local store).
- Separate Node host (Fly/Railway) only if Streamable HTTP on Vercel starts dropping sessions; stateless JSON is the current bet.
