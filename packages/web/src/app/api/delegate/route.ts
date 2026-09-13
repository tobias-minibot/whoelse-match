import { gatewayDelegate } from "@whoelse/core";
import { resolveCaller } from "@/lib/auth";
import { getNetwork } from "@/lib/engine";
import { gatewayResponse } from "@/lib/respond";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const network = await getNetwork();
  const caller = await resolveCaller(req, network);
  const body = await req.json().catch(() => ({}));
  const task = String(body.task ?? body.intent ?? "").trim();
  if (!task) return Response.json({ error: "task required", status: 400 }, { status: 400 });
  return gatewayResponse(
    await gatewayDelegate(network, { task, intent: body.intent, from: body.from, select: body.select, limit: body.limit }, caller),
  );
}
