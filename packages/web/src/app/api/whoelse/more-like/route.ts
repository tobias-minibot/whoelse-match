import { NextResponse } from "next/server";
import { getEngine } from "@/lib/engine";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.entityId) {
    return NextResponse.json({ error: "entityId required" }, { status: 400 });
  }
  const result = await getEngine().whoelseAsync({
    context: body.context ?? `Who else like this?`,
    entityId: body.entityId,
    exclude: body.exclude,
    mode: body.mode ?? "expand",
    constraints: body.constraints,
    limit: body.limit ?? 8,
  });
  return NextResponse.json(result);
}
