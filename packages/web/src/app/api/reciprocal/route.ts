import { toPublicWhoElseResult } from "@whoelse/core";
import { getEngine } from "@/lib/engine";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const entityId = String(body.entityId ?? "");
  if (!entityId) return Response.json({ error: "entityId required", status: 400 }, { status: 400 });
  try {
    const result = (await getEngine()).reciprocal(entityId, { context: body.context, limit: body.limit ?? 5 });
    return Response.json(toPublicWhoElseResult(result));
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err), status: 404 }, { status: 404 });
  }
}
