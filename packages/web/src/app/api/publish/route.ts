import { gatewayPublish } from "@whoelse/core";
import { resolveCaller } from "@/lib/auth";
import { getNetwork } from "@/lib/engine";
import { gatewayResponse } from "@/lib/respond";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const network = await getNetwork();
  const caller = await resolveCaller(req, network);
  const body = await req.json().catch(() => ({}));
  if (!body.entityId || !Array.isArray(body.publications) || body.publications.length === 0) {
    return Response.json({ error: "entityId and publications[] required", status: 400 }, { status: 400 });
  }
  return gatewayResponse(await gatewayPublish(network, body.entityId, body.publications, caller));
}
