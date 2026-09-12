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
