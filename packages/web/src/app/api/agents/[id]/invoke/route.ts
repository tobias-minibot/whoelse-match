import { gatewayInvoke } from "@whoelse/core";
import { resolveCaller } from "@/lib/auth";
import { getNetwork } from "@/lib/engine";
import { gatewayResponse } from "@/lib/respond";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const network = await getNetwork();
  const caller = await resolveCaller(req, network);
  const body = await req.json().catch(() => ({}));
  return gatewayResponse(await gatewayInvoke(network, id, body, caller));
}
