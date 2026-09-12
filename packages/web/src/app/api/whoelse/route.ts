import { NextResponse } from "next/server";
import { getEngine } from "@/lib/engine";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json();
  const result = await getEngine().whoelseAsync({
    context: String(body.context ?? body.query ?? ""),
    predicate: body.predicate,
    constraints: body.constraints,
    exclude: body.exclude,
    mode: body.mode,
    entityId: body.entityId,
    limit: body.limit ?? 8,
  });
  return NextResponse.json(result);
}
