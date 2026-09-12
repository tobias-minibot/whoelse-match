# Who Else? -- Real-Time Intent Matching

**One-liner:** Find people who want the same thing you want, right now, right here.

---

## Company Overview

**Who Else?** is a real-time intent matching platform. You say what you're doing or need -- in plain language -- and we instantly connect you with nearby people who want the same thing. Ephemeral. Live. Context-aware. Think Tinder for everything except dating.

---

## The Problem

Serendipity is dead.

You're at a 10,000-person conference. You want to grab lunch with someone working on AI safety. Statistically, 400 people in that building share your interest. You will meet zero of them.

You just moved to a new city. You want to find a pickup basketball game tonight. There are eight happening within two miles of you. You'll never know.

You're stuck on a gnarly React bug at 11pm. Three other developers in your neighborhood are stuck on the same thing. You'll each suffer alone.

**We are more connected than ever and more alone than ever.** The internet solved information discovery. It never solved *people* discovery -- not in real time, not based on what you actually want right now.

The status quo is broken in specific, measurable ways:

- **Meetup** requires someone to organize something days in advance. Spontaneity is impossible.
- **Dating apps** solved real-time matching but only for romance. The mechanics work -- the scope is artificially narrow.
- **Slack/Discord** are async and community-bound. You have to already be in the right room.
- **Social media** is performative, not coordinative. You broadcast; you don't match.
- **Group chats** require pre-existing relationships. They can't surface strangers with aligned intent.

The result: billions of missed connections every day. Not romantic ones -- *functional* ones. People who could have helped each other, collaborated, shared a meal, split a cab, formed a band, started a company. They were in the same place at the same time with the same intent, and they never found each other.

---

## The Solution

**Who Else?** lets you type (or speak) what you want in natural language:

- *"Who else wants to get lunch and talk about climate tech?"*
- *"Who else is looking for a fourth for tennis this afternoon?"*
- *"Who else is working on their YC application tonight and wants to co-work?"*
- *"Who else just arrived in Lisbon and wants to explore the Alfama district?"*

Our system does three things:

1. **Understands intent** -- using LLMs to parse what you actually want (activity, topic, timing, vibe) beyond simple keyword matching.
2. **Matches in real time** -- finds other users with compatible intent who are nearby (or in the same context: same conference, same campus, same flight).
3. **Creates ephemeral groups** -- spins up a temporary chat/meetup that dissolves when the moment passes. No lingering groups. No notification debt. No dead communities.

The interaction model is deliberately lightweight:
- Post an intent (10 seconds)
- Get matched (under 60 seconds)
- Meet up or collaborate (minutes to hours)
- The thread disappears

No profiles to maintain. No followers. No feed. No algorithm optimizing for engagement. Just coordination.

---

## Why Now?

Three technology curves are converging simultaneously:

### 1. LLMs understand natural language intent (2023-present)
For the first time, we can take a messy human sentence like "who else wants to grab ramen and talk about whether LLMs are actually reasoning" and decompose it into structured intent: activity (dining), cuisine (ramen), topic (AI/reasoning), timing (now), vibe (casual intellectual). This was impossible two years ago. It's trivial today.

### 2. Location technology is mature and ubiquitous
Precise indoor positioning (UWB, BLE beacons), geofencing, and venue-aware APIs mean we can match people not just by city but by building, floor, or conference hall. Apple and Google have invested billions in this infrastructure. We ride on top of it.

### 3. Cultural readiness
Post-pandemic loneliness is a recognized public health crisis. The Surgeon General issued an advisory. Gen Z reports unprecedented levels of isolation despite being the most "connected" generation. There is active, articulated demand for tools that create real-world human connection. The stigma of "meeting people through an app" has fully evaporated.

### 4. Event and conference tech is ripe for disruption
The $1.5T events industry still runs on lanyards, paper agendas, and awkward cocktail hours for networking. Every major conference app is a static schedule viewer. None of them solve the actual problem attendees have: finding *their* people.

---

## Market Size

**TAM: $47B** -- Global market for social discovery, event networking, and real-time coordination tools.

**SAM: $8.2B** -- English-speaking markets, focusing on professional events, universities, and urban social coordination.

**SOM (Year 3): $120M** -- Capturing 1.5% of the event networking market and establishing footholds in 200 universities.

### Market segments (in order of attack):

| Segment | Size | Why it works |
|---------|------|-------------|
| Tech conferences & events | $2.1B | High density, tech-savvy, acute pain point |
| Universities & campuses | $1.8B | Captive audience, social hunger, viral dynamics |
| Coworking spaces | $900M | Community is the product; we make it actually work |
| Urban social (cities) | $3.4B | Largest long-term opportunity |

---

## Business Model

### Freemium consumer product
- **Free tier:** 5 intents per day, basic matching, 1-mile radius
- **Premium ($9.99/month):** Unlimited intents, expanded radius, priority matching, topic filters, group size preferences

### B2B event product (primary early revenue)
- **Who Else? for Events** -- white-label or integrated intent matching for conferences and large gatherings
- **Pricing:** $2-5 per attendee, sold to event organizers
- **Value prop:** "Your attendees will actually network. Not stand in corners checking email."
- Conference tier: $5,000-25,000 per event depending on size

### B2B campus product
- **Who Else? for Campus** -- sold to universities as a student life / mental health tool
- **Pricing:** $1-3 per student per semester, institutional license
- Directly addresses the campus loneliness crisis that deans of students are desperate to solve

### Long-term
- Marketplace dynamics: venues and restaurants bid to host matched groups ("10 people want ramen near you -- offer a group deal")
- Data insights (anonymized, aggregated) for urban planning, event design, commercial real estate

---

## Traction Plan

### Phase 1: Conferences (Months 1-6)
- Deploy at 10-15 mid-size tech conferences (1,000-5,000 attendees)
- Partner with organizers who want to differentiate on networking quality
- Target: 30% attendee adoption, 4.5+ satisfaction rating
- Revenue: $50K-150K from event contracts
- Key metric: matches per attendee, meetups actually completed

### Phase 2: Campuses (Months 4-12)
- Launch at 5 universities, starting with Stanford, MIT, and 3 mid-size schools
- Partner with student life offices and orientation programs
- Target: 15% student body adoption within first semester
- Key metric: weekly active intents per user, retention at week 8

### Phase 3: Cities (Months 9-18)
- Open consumer product in 3 cities with highest conference/campus density
- Organic growth from conference and campus users who want it in daily life
- Target: 50K MAU per city within 6 months of launch
- Key metric: successful matches per day, geographic density

### Launch strategy
- No cold start problem at events (everyone is already there, already wants to network)
- Campus ambassadors program (free premium for student organizers)
- "Who Else?" moments at conferences -- physical signage: "Want to find your people? Text your intent to [number]"

---

## Why This Team

### The STS Insight

This company is built on an insight from Science-Technology-Society Studies, not from Silicon Valley product thinking.

**The core thesis:** Every information system, every knowledge network, every internet platform ultimately reduces to a single question: *"Who else?"*

- Google: "Who else has written about this topic?" (mediated through documents)
- Twitter: "Who else is thinking about this right now?" (mediated through posts)
- Stack Overflow: "Who else has solved this problem?" (mediated through Q&A)
- Reddit: "Who else cares about this niche thing?" (mediated through subreddits)

Every one of these platforms answers "who else?" *indirectly* -- through content as a proxy for people. They match you with artifacts, not with humans.

**Who Else?** removes the mediation layer. It answers the question directly. No content proxy. No profile performance. Just: here's what I want, who else wants it?

An STS background means understanding:
- How technologies of coordination shape social outcomes
- Why platform design choices become social infrastructure
- How to build systems that serve human agency rather than extract attention
- The history of every failed and successful attempt at social matching -- and *why* they succeeded or failed

This isn't a feature insight. It's a structural insight about what the internet has been trying to do for 30 years and hasn't finished building yet.

---

## Competitive Landscape

| Competitor | What they do | Why they lose |
|-----------|-------------|--------------|
| **Meetup** | Scheduled group events | Requires advance planning. No spontaneity. Organizer-dependent. Dying engagement. |
| **Bumble BFF** | Friend-matching via profiles | Profile-based, not intent-based. Swipe fatigue. No real-time context. Still feels like dating. |
| **Lunchclub** | AI-matched professional networking | Scheduled, async, 1:1 only. Optimizes for career networking, not lived experience. |
| **Geneva/Discord** | Community chat rooms | You must already know the community exists. Async. No location awareness. |
| **Conference apps (Whova, Brella)** | Event scheduling and networking | Profile browsing, scheduled meetings. Nobody actually uses the networking features. |
| **Spontaneous (various startups)** | "Let's hang out" apps | Failed because no density. Cold start problem. We solve this by starting at events where density is guaranteed. |

### Our moat
1. **Network density** -- matching only works with density. Our event-first strategy guarantees density from day one.
2. **Intent understanding** -- LLM-powered semantic matching is a genuine technical differentiator. "Want to talk about AI safety over coffee" matches with "looking for casual conversation about alignment research" -- no keyword overlap required.
3. **Ephemeral design** -- no social graph to maintain means no social graph to compete with. We don't need you to leave Instagram. We layer on top of your life.

---

## Five-Year Vision

**Year 1:** The must-have app at every major tech conference. "Did they have Who Else?" becomes a criterion for attending events.

**Year 2:** Present on 200+ university campuses. Becomes the default way students find study partners, dining companions, and activity groups. Student life offices fund it as mental health infrastructure.

**Year 3:** Consumer launch in 25 cities. "Who Else?" enters common usage as a verb -- "Just who-else it." Urban loneliness metrics begin to shift in launch cities.

**Year 4:** International expansion. Platform for local businesses to engage with intent-matched groups. Revenue diversification beyond subscriptions.

**Year 5:** The real-time social coordination layer for physical life. When you want to do anything with anyone, anywhere, your first instinct is to ask "Who Else?" We become the infrastructure for spontaneous human connection -- the thing the internet was supposed to enable from the beginning but never quite built.

**The endgame:** Physical space becomes as coordinable as digital space. The loneliness epidemic isn't solved by more content, more feeds, more notifications. It's solved by one simple question, answered instantly: *Who else?*

---

## The Ask

**Raising:** $2M seed round

**Use of funds:**
- 60% Engineering (LLM matching engine, real-time infrastructure, mobile apps)
- 20% Go-to-market (conference partnerships, campus launches)
- 10% Operations
- 10% Reserve

**Key milestones for the round:**
- Launch at 20 conferences with 30%+ adoption
- 5 university deployments with 15%+ student body penetration
- 100K total matches completed
- $200K ARR from event contracts

---

*Who Else? -- Because the answer to loneliness was always a question.*
