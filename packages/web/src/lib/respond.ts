import { NextResponse } from "next/server";
import type { GatewayResult } from "@whoelse/core";

export function gatewayResponse<T>(result: GatewayResult<T>): NextResponse {
  return NextResponse.json(result.body, { status: result.status });
}
