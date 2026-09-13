import { gatewayFeedback } from "@whoelse/core";
import { resolveCaller } from "@/lib/auth";
import { getNetwork } from "@/lib/engine";
import { gatewayResponse } from "@/lib/respond";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const network = await getNetwork();
  const caller = await resolveCaller(req, network);
  const body = await req.json();
  return gatewayResponse(
    await gatewayFeedback(network, { entityId: body.entityId, signal: body.signal, query: body.query }, caller),
  );
}
