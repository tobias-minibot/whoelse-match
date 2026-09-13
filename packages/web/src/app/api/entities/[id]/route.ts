import { publicEntityOr404 } from "@whoelse/core";
import { getEngine } from "@/lib/engine";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = publicEntityOr404(await getEngine(), id);
  return Response.json(result.body, { status: result.status });
}
