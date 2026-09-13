import { gatewayListMatches, gatewayProposeMatch } from "@whoelse/core";
import { resolveCaller } from "@/lib/auth";
import { getNetwork } from "@/lib/engine";
import { gatewayResponse } from "@/lib/respond";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const network = await getNetwork();
  const caller = await resolveCaller(req, network);
  return gatewayResponse(await gatewayListMatches(network, caller));
}

export async function POST(req: Request) {
  const network = await getNetwork();
  const caller = await resolveCaller(req, network);
  const body = await req.json();
  return gatewayResponse(
    await gatewayProposeMatch(
      network,
      {
        requesterEntityId: body.requesterEntityId,
        candidateEntityId: String(body.candidateEntityId ?? ""),
        seekPublicationId: body.seekPublicationId,
        offerPublicationId: body.offerPublicationId,
        query: body.query,
        score: body.score,
        explanation: body.explanation,
      },
      caller,
    ),
  );
}
