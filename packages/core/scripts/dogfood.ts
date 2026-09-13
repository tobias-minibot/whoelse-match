import { WhoElseEngine } from "../src/index.ts";

const engine = WhoElseEngine.fromSeed();
const nova = engine.store.get("ai-nova");

const queries: { q: string; entityId?: string }[] = [
  { q: "Who else should I meet?" },
  { q: "Who else should I date?" },
  { q: "Someone in DC who is obsessed with AI, likes building things, and would rather discuss a crazy idea over coffee than attend a networking event." },
  { q: "Who else likes cycling?" },
  { q: "Who else is available this weekend?" },
  { q: "Who else like Nova?", entityId: nova?.id },
  { q: "Who else thinks like me but disagrees politically?" },
  { q: "Who else can summarize this PDF?" },
  { q: "Who else can browse the web?" },
  { q: "Who else can translate German to English?" },
  { q: "Who else can verify this result?" },
  { q: "Who else can run this task more cheaply?" },
  { q: "Who else can take over if the primary agent fails?" },
  { q: "Who else should I delegate this to?" },
  { q: "Who else has an apartment?" },
  { q: "Who else can give me a ride?" },
  { q: "Who else has a 1-bedroom apartment in DC under $2,500?" },
  { q: "Who else has a furnished sublet in Berlin for three months?" },
  { q: "Who else has a place near Georgetown?" },
  { q: "Who else accepts pets?" },
  { q: "Who else needs a furnished apartment in Berlin?" },
  { q: "Who else might be a good tenant for this listing?", entityId: "resource-apt-dc-georgetown-1br" },
  { q: "Who else is hiring AI people in Washington?" },
  { q: "Who else needs someone with my background?" },
  { q: "Who else is available for a two-week coding project?" },
  { q: "Who else can do this work for under $5,000?" },
  { q: "Who else is looking for a role like this?" },
  { q: "Who else should I recruit?" },
  { q: "Who else has done this exact kind of work before?" },
  { q: "Who else can start immediately?" },
  { q: "Who else is a better fit but less obvious?" },
  { q: "Who else could do this job — human or AI?" },
  { q: "Who else can give me a ride from Georgetown to Dupont?" },
  { q: "Who else needs a ride to the airport?" },
  { q: "Who else can fix a leak under my sink before the weekend?" },
  { q: "Who else needs a licensed plumber?" },
  { q: "Who else has a cheaper equivalent 18V drill in stock?" },
  { q: "Who else knows about this market?" },
  { q: "Who else invests and writes $250k checks?" },
  { q: "Who else has a room tonight in Berlin?" },
  { q: "Who else is attending a meetup from my city?" },
  { q: "Who else can babysit tonight nearby?" },
  { q: "Who else has complementary design and wants to join this project?" },
  { q: "Who else can host a GPU cheaper?" },
  { q: "Who else has a dataset that is the original source?" },
  { q: "Who else sells nearby and is open now?" },
  { q: "I need help understanding this market." },
];

queries.forEach((item, i) => {
  const result = engine.whoelse({ context: item.q, entityId: item.entityId, limit: 5 });
  console.log(`\n=== ${i + 1}. ${item.q}`);
  if (result.candidates.length === 0) {
    console.log("  (no signal — empty on purpose)");
    return;
  }
  for (const c of result.candidates) {
    const why = c.explanation.why.replace(/\s+/g, " ").slice(0, 140);
    console.log(`  ${c.entity.id} | ${c.entity.type} | ${c.entity.name} | ${c.score.toFixed(3)} | ${why}`);
  }
});
