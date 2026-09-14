import { gatewayDispatch } from "@whoelse/core";
import { resolveCaller } from "@/lib/auth";
import { clientIp } from "@/lib/client-ip";
import { getNetwork } from "@/lib/engine";
import { gatewayResponse } from "@/lib/respond";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const network = await getNetwork();
  const caller = await resolveCaller(req, network);
  const body = await req.json().catch(() => ({}));
  return gatewayResponse(
    await gatewayDispatch(
      network,
      {
        text: String(body.text ?? body.context ?? body.intent ?? ""),
        limit: body.limit,
      },
      caller,
      { ip: clientIp(req) },
    ),
  );
}
