import { gatewayFind } from "@whoelse/core";
import { resolveCaller } from "@/lib/auth";
import { getNetwork } from "@/lib/engine";
import { gatewayResponse } from "@/lib/respond";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.entityId) {
    return Response.json({ error: "entityId required", status: 400 }, { status: 400 });
  }
  const network = await getNetwork();
  const caller = await resolveCaller(req, network);
  return gatewayResponse(
    await gatewayFind(
      network,
      {
        context: body.context ?? "Who else like this?",
        entityId: body.entityId,
        exclude: body.exclude,
        mode: body.mode ?? "expand",
        constraints: body.constraints,
        requester: body.requester,
        limit: body.limit ?? 8,
      },
      caller,
    ),
  );
}
