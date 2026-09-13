import { gatewayGetMatch } from "@whoelse/core";
import { resolveCaller } from "@/lib/auth";
import { getNetwork } from "@/lib/engine";
import { gatewayResponse } from "@/lib/respond";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const network = await getNetwork();
  const caller = await resolveCaller(req, network);
  const { id } = await ctx.params;
  return gatewayResponse(await gatewayGetMatch(network, id, caller));
}
