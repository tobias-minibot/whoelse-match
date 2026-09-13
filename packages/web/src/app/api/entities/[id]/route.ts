import { publicEntityOr404 } from "@whoelse/core";
import { resolveCaller } from "@/lib/auth";
import { getNetwork } from "@/lib/engine";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const network = await getNetwork();
  const caller = await resolveCaller(req, network);
  const owned = Boolean(caller && network.identity.owns(caller.principalId, id));
  const result = publicEntityOr404(network.engine, id, { allowPrivate: owned });
  return Response.json(result.body, { status: result.status });
}
