import { NextResponse } from "next/server";
import { getEngine } from "@/lib/engine";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json();
  const event = getEngine().feedback(body.entityId, body.signal, body.query);
  return NextResponse.json({ ok: true, event });
}
