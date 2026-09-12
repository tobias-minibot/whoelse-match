import { NextResponse } from "next/server";
import { getEngine } from "@/lib/engine";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entity = getEngine().store.get(id);
  if (!entity) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(entity);
}
