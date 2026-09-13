import { NextResponse } from "next/server";
import { getEngine } from "@/lib/engine";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getEngine().store.stats());
}
