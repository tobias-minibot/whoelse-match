import { NextResponse } from "next/server";
import { hasOpenAi } from "@whoelse/core";
import { getEngine } from "@/lib/engine";

export const runtime = "nodejs";

export async function GET() {
  const store = getEngine().store;
  const byType: Record<string, number> = {};
  for (const e of store.all()) byType[e.type] = (byType[e.type] ?? 0) + 1;
  const apartment = store.all().filter((e) => e.metadata.vertical === "apartment").length;
  return NextResponse.json({
    ok: true,
    humans: byType.human ?? 0,
    ais: byType.ai ?? 0,
    apartment,
    byType,
    openAi: hasOpenAi(),
  });
}
