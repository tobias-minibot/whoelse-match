import { gatewayOnboard } from "@whoelse/core";
import { resolveCaller } from "@/lib/auth";
import { getNetwork } from "@/lib/engine";
import { gatewayResponse } from "@/lib/respond";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const network = await getNetwork();
  const caller = await resolveCaller(req, network);
  const body = await req.json().catch(() => ({}));
  return gatewayResponse(
    await gatewayOnboard(
      network,
      {
        name: String(body.name ?? ""),
        description: String(body.description ?? ""),
        offers: body.offers,
        seeks: body.seeks,
        publications: body.publications,
        location: body.location,
        availability: body.availability,
        affirmAge: Boolean(body.affirmAge),
      },
      caller,
    ),
  );
}
