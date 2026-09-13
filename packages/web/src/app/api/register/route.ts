import { NextResponse } from "next/server";
import { getEngine } from "@/lib/engine";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!body.name || !body.description || !Array.isArray(body.offers) || body.offers.length === 0) {
    return NextResponse.json({ error: "name, description, and offers[] required" }, { status: 400 });
  }
  const entity = getEngine().register(body);
  return NextResponse.json({
    ok: true,
    entity: {
      id: entity.id,
      type: entity.type,
      name: entity.name,
      offers: entity.offers,
      seeks: entity.seeks,
      endpoint: entity.attributes.apiEndpoint,
    },
  });
}
