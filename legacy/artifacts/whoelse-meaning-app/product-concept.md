# WhoElse — Product Concept

## 1. One-sentence concept
**WhoElse** is a voice search engine where you say what you want once, and it figures out what you actually mean — then goes and gets it done across whatever mix of AIs, sites, apps, and people can do the job.

## 2. The consumer problem
Search still makes *you* do the translation. You have an intent — "someone to fix the leak under my sink before the weekend, not too pricey" — and you have to break it into keywords, tabs, forms, phone calls, and three different apps that don't talk to each other. Voice assistants promised better but mostly do one canned thing. And every AI hears you a little differently, so nothing composes. The work of turning *what I want* into *what happened* is still entirely on the human.

## 3. The product promise
**Say it once, naturally. We resolve what you mean, then get it done — wherever it needs to happen.**
You don't pick the tool, the site, or the wording. You don't repeat yourself for each system. WhoElse holds the *meaning* of your request and carries it to whoever or whatever can fulfill it — an AI agent, a booking site, a service catalog, a provider's API, or a real human.

## 4. The first user experience
- You tap once and speak: *"Find me a dentist near the office who takes my insurance and has something after 5pm this week."*
- A card comes back in seconds — not ten blue links, but **what it understood**: `dentist · near {work location} · accepts {your plan} · weekday evenings`. One tap to correct anything.
- Below it: **live options being worked in parallel** — two clinics with real 5:30pm slots, one that needs a callback (WhoElse is placing it), and a note that one won't confirm insurance online.
- You say *"book the 5:30 Thursday one."* Done. You get a confirmation, not a to-do list.

The feeling: you delegated, you didn't operate.

## 5. Under the hood, in plain language
1. **Hear** — you speak; any number of listeners may transcribe slightly differently. We don't care about exact words.
2. **Resolve meaning** — we collapse those near-agreeing transcripts into one structured intent: the *what*, the *constraints*, the *good-enough bar*. This shared-meaning object — not a transcript — is the thing everything downstream uses.
3. **Route** — we match that intent to whoever can fulfill it: AI agents, websites, apps, service catalogs, provider APIs, or humans. Different fulfillers, same meaning.
4. **Do the work** — WhoElse acts in parallel across them, negotiates the messy parts (a form here, a phone call there), and normalizes what comes back.
5. **Return an outcome** — you get results and completed actions, plus the one-tap trace of what it understood so trust is cheap to check.

The core asset is **the resolved intent**, portable across every system. That's what makes "who else can do this?" answerable.

## 6. Example scenarios
- **Local service:** *"Someone to deep-clean the apartment before my parents visit Saturday."* → three vetted cleaners with Saturday availability, one booked on your say-so.
- **Commerce:** *"A gift under $60 for a friend who just got into pour-over coffee."* → curated picks across retailers, shipped-in-time filtered, one-tap order.
- **Coordination:** *"Get the four of us to dinner Friday somewhere central, one of us is vegan."* → restaurant options meeting all constraints + reservation held.
- **Mixed AI + human:** *"Explain my new insurance letter and tell me if I need to do anything."* → an AI reads and summarizes; where it's unsure, a human expert is looped in — same request, no re-explaining.

## 7. Why this becomes a new kind of search engine
Old search indexes **documents** and returns **links**. WhoElse indexes **capabilities** — who/what can fulfill an intent — and returns **outcomes**. The unit of search shifts from *pages that match words* to *actors that can satisfy meaning*. As more agents, catalogs, and providers become reachable, the same spoken request quietly reaches more of them. "Who else can do this?" is a query no keyword engine can answer — and it gets better every time a new fulfiller connects.

## 8. What the first prototype must show
Prove the **spoken words → resolved meaning → real outcome** loop on *one* vertical (pick local services — highest "get it done" payoff).

Must demonstrate:
1. **Once-spoken input** with multiple transcripts in, one intent out — visibly *not* transcript-matching.
2. **A meaning card** the user can see and correct in one tap (the trust primitive).
3. **Parallel fulfillment across at least two kinds of channel** — e.g., a live API/booking path *and* a human/callback path — resolved from the same intent object.
4. **An outcome, not a list** — at least one request that ends in a booking/confirmation, no operating required.

If those four land in one demo, we've shown the thing no existing search or assistant does. Everything else is scaling the catalog of fulfillers.
