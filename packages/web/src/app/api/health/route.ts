import { NextResponse } from "next/server";
import { hasOpenAi } from "@whoelse/core";
import { getEngine } from "@/lib/engine";

export const runtime = "nodejs";

export async function GET() {
  const store = getEngine().store;
  return NextResponse.json({
    ok: true,
    humans: store.all().filter((e) => e.type === "human").length,
    ais: store.all().filter((e) => e.type === "ai").length,
    openAi: hasOpenAi(),
  });
}
