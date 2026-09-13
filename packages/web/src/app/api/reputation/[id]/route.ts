import { gatewayReputation } from "@whoelse/core";
import { resolveCaller } from "@/lib/auth";
import { clientIp } from "@/lib/client-ip";
import { getNetwork } from "@/lib/engine";
import { gatewayResponse } from "@/lib/respond";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const network = await getNetwork();
  const caller = await resolveCaller(req, network);
  const { id } = await ctx.params;
  return gatewayResponse(await gatewayReputation(network, id, caller, { ip: clientIp(req) }));
}
