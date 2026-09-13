import { toPublicCandidate } from "@whoelse/core";
import { getEngine } from "@/lib/engine";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json();
  const candidate = (await getEngine()).explain(body.entityId, body.context ?? "", body.entityContextId);
  if (!candidate) return Response.json({ error: "not found", status: 404 }, { status: 404 });
  return Response.json(toPublicCandidate(candidate));
}
