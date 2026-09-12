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

### Open questions we would run next

- Mixed rank vs sectioned rank: does anyone mis-read an AI as a human when the badge is present but the list is interleaved?
- Embeddings vs TF-IDF on the *same* 34 entities — where do synonyms break?
- Persist MCP feedback across Vercel isolates (today each request is a new process-local store).
- Separate Node host (Fly/Railway) only if Streamable HTTP on Vercel starts dropping sessions; stateless JSON is the current bet.
