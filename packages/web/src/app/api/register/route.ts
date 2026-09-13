import { gatewayRegister } from "@whoelse/core";
import { resolveCaller } from "@/lib/auth";
import { getNetwork } from "@/lib/engine";
import { gatewayResponse } from "@/lib/respond";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const network = await getNetwork();
  const caller = await resolveCaller(req, network);
  const body = await req.json().catch(() => ({}));
  const hasOffers = Array.isArray(body.offers) && body.offers.length > 0;
  const hasSeeks = Array.isArray(body.seeks) && body.seeks.length > 0;
  const hasPubs = Array.isArray(body.publications) && body.publications.length > 0;
  if (!body.name || !body.description) {
    return Response.json({ error: "name and description required", status: 400 }, { status: 400 });
  }
  if (!hasOffers && !hasSeeks && !hasPubs) {
    return Response.json({ error: "at least one offer or seek required", status: 400 }, { status: 400 });
  }
  return gatewayResponse(await gatewayRegister(network, body, caller));
}
