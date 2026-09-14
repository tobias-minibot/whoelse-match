import { gatewayCompile } from "@whoelse/core";
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
    await gatewayCompile(
      network,
      {
        text: String(body.text ?? body.context ?? body.intent ?? ""),
        find: Boolean(body.find),
        limit: body.limit,
      },
      caller,
      { ip: clientIp(req) },
    ),
  );
}

export async function GET(req: Request) {
  const network = await getNetwork();
  const caller = await resolveCaller(req, network);
  const url = new URL(req.url);
  return gatewayResponse(
    await gatewayCompile(
      network,
      {
        text: url.searchParams.get("text") ?? url.searchParams.get("q") ?? "",
        find: url.searchParams.get("find") === "1" || url.searchParams.get("find") === "true",
        limit: url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : undefined,
      },
      caller,
      { ip: clientIp(req) },
    ),
  );
}
