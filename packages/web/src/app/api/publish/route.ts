import { NextResponse } from "next/server";
import { getEngine } from "@/lib/engine";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!body.entityId || !Array.isArray(body.publications) || body.publications.length === 0) {
    return NextResponse.json({ error: "entityId and publications[] required" }, { status: 400 });
  }
  try {
    const entity = getEngine().publish(body.entityId, body.publications);
    return NextResponse.json({
      ok: true,
      entity: {
        id: entity.id,
        name: entity.name,
        offers: entity.offers,
        seeks: entity.seeks,
        publications: entity.publications?.map((p) => ({
          id: p.id,
          kind: p.kind,
          capability: p.capability,
        })),
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
