import { gatewayIntents } from "@whoelse/core";
import { gatewayResponse } from "@/lib/respond";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  return gatewayResponse(
    gatewayIntents({
      q: url.searchParams.get("q") ?? url.searchParams.get("query") ?? "",
      limit: url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : undefined,
    }),
  );
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return gatewayResponse(
    gatewayIntents({
      q: String(body.q ?? body.query ?? body.text ?? ""),
      limit: body.limit,
    }),
  );
}
