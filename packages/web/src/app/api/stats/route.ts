import { NextResponse } from "next/server";
import { gatewayStats } from "@whoelse/core";
import { getNetwork } from "@/lib/engine";

export const runtime = "nodejs";

export async function GET() {
  const network = await getNetwork();
  const result = await gatewayStats(network);
  return NextResponse.json(result.body, { status: result.status });
}
