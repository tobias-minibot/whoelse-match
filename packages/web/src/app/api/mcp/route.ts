import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createWhoElseMcpServer } from "@whoelse/mcp-server/server";
import { getEngine } from "@/lib/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Accept, MCP-Session-Id, MCP-Protocol-Version, Last-Event-ID",
};

function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS)) headers.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

/** Stateless Streamable HTTP — one transport per request. Same engine as the dating UI. */
export async function POST(req: Request) {
  const server = createWhoElseMcpServer(getEngine());
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    return withCors(await transport.handleRequest(req));
  } finally {
    await transport.close().catch(() => undefined);
    await server.close().catch(() => undefined);
  }
}

export async function GET() {
  return Response.json(
    {
      jsonrpc: "2.0",
      error: { code: -32000, message: "GET not used. POST Streamable HTTP to this URL." },
      id: null,
    },
    { status: 405, headers: CORS },
  );
}

export async function DELETE() {
  return Response.json(
    {
      jsonrpc: "2.0",
      error: { code: -32000, message: "Stateless MCP — no session to delete." },
      id: null,
    },
    { status: 405, headers: CORS },
  );
}
