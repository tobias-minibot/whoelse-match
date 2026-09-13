import { NextResponse } from "next/server";
import { hasOpenAi } from "@whoelse/core";
import { getEngine } from "@/lib/engine";

export const runtime = "nodejs";

export async function GET() {
  const store = getEngine().store;
  const byType: Record<string, number> = {};
  for (const e of store.all()) byType[e.type] = (byType[e.type] ?? 0) + 1;
  const byVertical: Record<string, number> = {};
  for (const e of store.all()) {
    const v = String(e.metadata.vertical ?? "unset");
    byVertical[v] = (byVertical[v] ?? 0) + 1;
  }
  return NextResponse.json({
    ok: true,
    humans: byType.human ?? 0,
    ais: byType.ai ?? 0,
    apartment: byVertical.apartment ?? 0,
    jobs: byVertical.jobs ?? 0,
    rides: byVertical.rides ?? 0,
    services: byVertical.services ?? 0,
    byType,
    byVertical,
    openAi: hasOpenAi(),
    mcpTools: [
      "whoelse.find",
      "whoelse_find",
      "whoelse.register",
      "whoelse.invoke",
      "whoelse.delegate",
      "whoelse.feedback",
    ],
  });
}
