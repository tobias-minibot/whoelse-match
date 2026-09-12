import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { after, before, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { WhoElseEngine } from "@whoelse/core";
import { createWhoElseMcpServer } from "./create-server.js";

async function toWebRequest(req: IncomingMessage, port: number): Promise<Request> {
  const url = `http://127.0.0.1:${port}${req.url ?? "/"}`;
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === "string") headers.set(k, v);
    else if (Array.isArray(v)) headers.set(k, v.join(", "));
  }
  const method = req.method ?? "GET";
  if (method === "GET" || method === "HEAD") {
    return new Request(url, { method, headers });
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return new Request(url, { method, headers, body: Buffer.concat(chunks) });
}

describe("Streamable HTTP whoelse.find (real SDK client, not stdio)", () => {
  let port = 0;
  let closeServer: () => Promise<void>;
  let client: Client;
  const engine = WhoElseEngine.fromSeed();

  before(async () => {
    const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      const server = createWhoElseMcpServer(engine);
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      await server.connect(transport);
      try {
        const request = await toWebRequest(req, port);
        const response = await transport.handleRequest(request);
        res.statusCode = response.status;
        response.headers.forEach((value, key) => res.setHeader(key, value));
        res.end(Buffer.from(await response.arrayBuffer()));
      } finally {
        await transport.close().catch(() => undefined);
        await server.close().catch(() => undefined);
      }
    });
    await new Promise<void>((resolve) => {
      httpServer.listen(0, "127.0.0.1", () => resolve());
    });
    const addr = httpServer.address();
    if (!addr || typeof addr === "string") throw new Error("no port");
    port = addr.port;
    closeServer = () =>
      new Promise((resolve, reject) => httpServer.close((err) => (err ? reject(err) : resolve())));

    client = new Client({ name: "whoelse-http-test", version: "0.2.0" });
    await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`)));
  });

  after(async () => {
    await client.close();
    await closeServer();
  });

  it("lists whoelse.find over HTTP", async () => {
    const { tools } = await client.listTools();
    assert.ok(tools.some((t) => t.name === "whoelse.find"));
  });

  it("finds Summarizer then exposes an invoke next-step", async () => {
    const result = await client.callTool({
      name: "whoelse.find",
      arguments: { intent: "Who else can summarize this PDF?", limit: 3 },
    });
    const text = (result.content as { type: string; text?: string }[])
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("\n");
    const body = JSON.parse(text) as {
      matches: { name: string; type: string; next: { action: string; via: string } }[];
    };
    assert.match(body.matches[0].name, /Summarizer/i);
    assert.equal(body.matches[0].next.action, "invoke");
    assert.match(body.matches[0].next.via, /invoke/);
  });
});
