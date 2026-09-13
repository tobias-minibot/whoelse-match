import { gatewayMintAgentKey } from "@whoelse/core";
import { resolveCaller } from "@/lib/auth";
import { getNetwork } from "@/lib/engine";
import { gatewayResponse } from "@/lib/respond";

export const runtime = "nodejs";

/** Signed-in humans mint an agent principal + one-time API key. */
export async function POST(req: Request) {
  const network = await getNetwork();
  const caller = await resolveCaller(req, network);
  return gatewayResponse(await gatewayMintAgentKey(network, caller));
}
