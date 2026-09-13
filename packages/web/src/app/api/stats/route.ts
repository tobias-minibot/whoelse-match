import { getEngine } from "@/lib/engine";

export const runtime = "nodejs";

export async function GET() {
  return Response.json((await getEngine()).store.stats());
}
