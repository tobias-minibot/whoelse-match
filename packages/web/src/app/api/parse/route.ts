import { NextResponse } from "next/server";
import { getEngine } from "@/lib/engine";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const text = String(body.context ?? body.query ?? body.intent ?? "").trim();
  if (!text) return NextResponse.json({ error: "context required" }, { status: 400 });
  return NextResponse.json((await getEngine()).parse(text));
}
