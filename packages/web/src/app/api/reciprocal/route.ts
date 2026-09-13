import { NextResponse } from "next/server";
import { getEngine } from "@/lib/engine";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const entityId = String(body.entityId ?? "");
  if (!entityId) return NextResponse.json({ error: "entityId required" }, { status: 400 });
  try {
    const result = getEngine().reciprocal(entityId, { context: body.context, limit: body.limit ?? 5 });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 404 });
  }
}
