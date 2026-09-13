import { gatewayFind } from "@whoelse/core";
import { resolveCaller } from "@/lib/auth";
import { clientIp } from "@/lib/client-ip";
import { getNetwork } from "@/lib/engine";
import { gatewayResponse } from "@/lib/respond";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const network = await getNetwork();
  const caller = await resolveCaller(req, network);
  const body = await req.json();
  return gatewayResponse(
    await gatewayFind(
      network,
      {
        context: String(body.context ?? body.query ?? ""),
        predicate: body.predicate,
        requester: body.requester,
        constraints: body.constraints,
        exclude: body.exclude,
        knownEntities: body.knownEntities,
        mode: body.mode,
        entityId: body.entityId,
        limit: body.limit ?? 8,
        availability: body.availability,
        ranking: body.ranking,
        minTrust: body.minTrust,
      },
      caller,
      { ip: clientIp(req) },
    ),
  );
}
