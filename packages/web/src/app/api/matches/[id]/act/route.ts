import { gatewayAct, type ActionType } from "@whoelse/core";
import { resolveCaller } from "@/lib/auth";
import { getNetwork } from "@/lib/engine";
import { gatewayResponse } from "@/lib/respond";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const network = await getNetwork();
  const caller = await resolveCaller(req, network);
  const { id } = await ctx.params;
  const body = await req.json();
  return gatewayResponse(
    await gatewayAct(
      network,
      {
        matchId: id,
        action: String(body.action ?? "") as ActionType,
        actorEntityId: body.actorEntityId,
        message: body.message,
        task: body.task,
        status: body.status,
        outcome: body.outcome,
      },
      caller,
    ),
  );
}
