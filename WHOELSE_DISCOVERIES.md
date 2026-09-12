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

What we built to test it: a generic `Entity` (no dating types in core), `WHOELSE(context, predicate?, constraints?, exclude?, mode?)`, four MCP tools, a thin HTTP wrapper, and a UI whose only primary CTA is **Who else?**

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
4. **`exclude` is load-bearing for recursion.** Without excluding the exemplar *and* the already-seen ids, “Who else like Sam?” returns Sam-adjacent copies of the same five. The session `seen` list is part of the operator, not UI state trivia.
5. **Mode inference is easy to overfit.** `instead of` → substitute is reliable. Treating *any* exemplar as `peers` is not — it hid AIs after a human card. Dating default stays `expand` unless the user says peers / colleagues / instead.
6. **Feedback has to be query-weighted.** A global “less like Maya” poisons housing *and* dinner-walk queries. Same-query events get a heavier penalty. This is still in-memory and still too small, but the shape is right.
7. **Disclosure has to live on the entity, not the stylesheet.** `metadata.aiDisclosure` and `metadata.demoLabel` travel through MCP, HTTP, and cards. If a future mixed-rank view drops section headers, the badge and the sentence still say AI / synthetic.
8. **Chat stubs leak product truth.** An AI chat that never says “I am an AI” trains the wrong expectation even in a demo. The stub opens with a disclosure. Human “chat” is not a chat — it is an interest record — so the toast says nothing was sent.
9. **Seed path resolution is an ops problem.** Next’s cwd is `packages/web`; MCP’s is `packages/mcp-server`. Walking up to `data/seed.json` (or `WHOELSE_SEED_PATH`) is why `pnpm dev` and `pnpm mcp` both work from the repo root *and* from a package directory.
10. **Existing landing is a second, dumber matcher.** We left the chip-demo in `landing/index.html` as story, and pointed the primary CTA at the real app. Deleting it would have erased the metaphor; keeping it without a link would have stranded testers in a fake.

### Open questions we would run next

- Mixed rank vs sectioned rank: does anyone mis-read an AI as a human when the badge is present but the list is interleaved?
- Embeddings vs TF-IDF on the *same* 34 entities — where do synonyms break?
- Should `whoelse_find` + `whoelse_more_like` collapse into one tool with an optional `entityId`? (They share an engine method. Two tools were clearer for MCP clients.)
