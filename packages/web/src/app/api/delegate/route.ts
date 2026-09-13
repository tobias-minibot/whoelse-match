import { NextResponse } from "next/server";
import { getEngine } from "@/lib/engine";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const task = String(body.task ?? body.intent ?? "").trim();
  if (!task) return NextResponse.json({ error: "task required" }, { status: 400 });
  const result = getEngine().delegate({
    task,
    intent: body.intent,
    from: body.from,
    select: body.select,
    limit: body.limit,
  });
  return NextResponse.json(result);
}
