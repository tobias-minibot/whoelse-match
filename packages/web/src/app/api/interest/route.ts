import { NextResponse } from "next/server";
import { getEngine } from "@/lib/engine";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json();
  try {
    const record = getEngine().recordHumanInterest(body.entityId, body.note);
    return NextResponse.json({
      ok: true,
      record,
      message: "Interest recorded (stub). No message was sent — this is a demo.",
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
