import { gatewayRevokeAgentKey } from "@whoelse/core";
import { resolveCaller } from "@/lib/auth";
import { getNetwork } from "@/lib/engine";
import { gatewayResponse } from "@/lib/respond";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const network = await getNetwork();
  const caller = await resolveCaller(req, network);
  const body = await req.json().catch(() => ({}));
  if (!body.keyId) return Response.json({ error: "keyId required", status: 400 }, { status: 400 });
  return gatewayResponse(await gatewayRevokeAgentKey(network, caller, body.keyId));
}
