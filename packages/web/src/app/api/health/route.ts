import { hasOpenAi, getPlaygroundEngine } from "@whoelse/core";
import { getNetwork } from "@/lib/engine";

export const runtime = "nodejs";

export async function GET() {
  const network = await getNetwork();
  const store = network.engine.store;
  const byType: Record<string, number> = {};
  for (const e of store.all()) byType[e.type] = (byType[e.type] ?? 0) + 1;
  const byVertical: Record<string, number> = {};
  for (const e of store.all()) {
    const v = String(e.metadata.vertical ?? "unset");
    byVertical[v] = (byVertical[v] ?? 0) + 1;
  }
  return Response.json({
    ok: true,
    persistence: network.persist ? "postgres" : "memory",
    seedMode: network.seedMode,
    humans: byType.human ?? 0,
    ais: byType.ai ?? 0,
    apartment: byVertical.apartment ?? 0,
    jobs: byVertical.jobs ?? 0,
    rides: byVertical.rides ?? 0,
    services: byVertical.services ?? 0,
    products: byVertical.products ?? 0,
    experts: byVertical.experts ?? 0,
    capital: byVertical.capital ?? 0,
    travel: byVertical.travel ?? 0,
    events: byVertical.events ?? 0,
    childcare: byVertical.childcare ?? 0,
    collab: byVertical.collab ?? 0,
    compute: byVertical.compute ?? 0,
    data: byVertical.data ?? 0,
    local: byVertical.local ?? 0,
    byType,
    byVertical,
    playground: {
      available: true,
      entities: getPlaygroundEngine().store.all().length,
      note: "Labeled demo corpus. Used only when live find has no useful matches. Never mixed in.",
    },
    openAi: hasOpenAi(),
    mcpTools: [
      "whoelse.find",
      "whoelse_find",
      "whoelse.register",
      "whoelse.publish",
      "whoelse.match",
      "whoelse.act",
      "whoelse.receipt",
      "whoelse.reputation",
      "whoelse.matches",
      "whoelse.invoke",
      "whoelse.delegate",
      "whoelse.feedback",
      "whoelse.compile",
      "whoelse.dispatch",
      "whoelse.intents",
    ],
  });
}
