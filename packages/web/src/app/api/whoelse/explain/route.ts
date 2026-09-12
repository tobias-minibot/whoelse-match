import { NextResponse } from "next/server";
import { getEngine } from "@/lib/engine";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json();
  const candidate = getEngine().explain(body.entityId, body.context ?? "", body.entityContextId);
  if (!candidate) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(candidate);
}
