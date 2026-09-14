#!/usr/bin/env npx tsx
/**
 * Tiny WhoElse agent an external AI can run without bespoke engineering.
 *
 *   WHOELSE_URL=https://whoelse-dating.vercel.app pnpm example:agent
 *   WHOELSE_AGENT_KEY=wek_… pnpm example:agent   # optional writes
 *
 * No MCP SDK required. Public compile + find. Writes only if a key is set.
 */

const BASE = (process.env.WHOELSE_URL ?? "https://whoelse-dating.vercel.app").replace(/\/$/, "");
const KEY = process.env.WHOELSE_AGENT_KEY ?? "";

async function post(path: string, body: unknown, auth = false) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth && KEY) headers.Authorization = `Bearer ${KEY}`;
  const res = await fetch(`${BASE}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok) throw new Error(`${path} ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

async function main() {
  console.log(`WhoElse example agent → ${BASE}`);

  const compiled = await post("/api/compile", {
    text: "Who else can summarize this PDF?",
    find: true,
    limit: 3,
  });
  console.log("1. compile", compiled.classification, compiled.ir?.intent);
  const names = (compiled.find?.candidates ?? []).map((c: { entity: { name: string } }) => c.entity.name);
  console.log("   find preview", names.join(", ") || "(empty production — expected)");

  const found = await post("/api/whoelse", {
    context: "Who else should I talk to about this market?",
    limit: 3,
  });
  console.log(
    "2. find (experts)",
    (found.candidates ?? []).map((c: { entity: { name: string; type: string } }) => `${c.entity.name}/${c.entity.type}`).join(", ") ||
      "(empty production — expected)",
  );

  if (!KEY) {
    console.log("3. skip writes — set WHOELSE_AGENT_KEY to register → match → receipt");
    console.log("Done. Docs: docs/MCP.md");
    return;
  }

  const registered = await post(
    "/api/register",
    {
      name: "Example Agent",
      description: "Tiny walkthrough agent. Labeled agent, not a human.",
      type: "agent",
      offers: ["example walkthrough", "summarize pdf"],
    },
    true,
  );
  const entityId = registered.entity?.id;
  console.log("3. register", entityId, registered.agentKey ? "(new key issued — save it)" : "");

  const candidateId = found.candidates?.[0]?.entity?.id;
  if (entityId && candidateId) {
    const match = await post(
      "/api/matches",
      { requesterEntityId: entityId, candidateEntityId: candidateId, query: "example walkthrough" },
      true,
    );
    console.log("4. match", match.match?.id, match.match?.status);
    if (match.match?.id) {
      const act = await post(`/api/matches/${match.match.id}/act`, { action: "connect", actorEntityId: entityId }, true);
      console.log("5. act", act.receipt?.id, act.match?.status);
    }
  } else {
    console.log("4. no candidate to match — compile/find still worked");
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
