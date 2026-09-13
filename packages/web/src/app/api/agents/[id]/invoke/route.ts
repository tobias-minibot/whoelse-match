import { NextResponse } from "next/server";
import { getEngine } from "@/lib/engine";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entity = getEngine().store.get(id);
  if (!entity) {
    return NextResponse.json({ error: "unknown entity" }, { status: 404 });
  }
  if (entity.type !== "agent") {
    return NextResponse.json({ error: "invoke is only stubbed for type=agent" }, { status: 400 });
  }
  const body = await req.json().catch(() => ({}));
  return NextResponse.json(getEngine().invoke(id, body));
}
