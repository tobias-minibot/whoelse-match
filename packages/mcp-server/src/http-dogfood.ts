/**
 * Real Streamable HTTP MCP client (not stdio).
 *   WHOELSE_MCP_URL=https://whoelse-dating.vercel.app/api/mcp pnpm mcp:http-dogfood
 *   WHOELSE_ORIGIN defaults to the MCP URL origin for invoke.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const MCP_URL = process.env.WHOELSE_MCP_URL ?? "http://localhost:3000/api/mcp";
const ORIGIN = process.env.WHOELSE_ORIGIN ?? new URL(MCP_URL).origin;

type Match = {
  id: string;
  type: string;
  name: string;
  score: number;
  why: string;
  next?: { action: string; via: string };
  attributes?: { apiEndpoint?: string };
};

function parseMatches(result: { content: { type: string; text?: string }[] }): Match[] {
  const text = result.content
    .filter((c) => c.type === "text")
    .map((c) => c.text ?? "")
    .join("\n");
  const body = JSON.parse(text) as { matches?: Match[] };
  return body.matches ?? [];
}

async function find(client: Client, intent: string, extra: Record<string, unknown> = {}) {
  const result = await client.callTool({
    name: "whoelse.find",
    arguments: { intent, limit: 5, ...extra },
  });
  return parseMatches(result as { content: { type: string; text?: string }[] });
}

const queries: { intent: string; extra?: Record<string, unknown> }[] = [
  { intent: "Who else can summarize this PDF?" },
  { intent: "Who else can browse the web?" },
  { intent: "Who else can verify this result?" },
  { intent: "Who else can take over if the primary agent fails?" },
  { intent: "Who else like Nova?", extra: { entityId: "ai-nova" } },
  { intent: "Who else should Tobias meet who is building an AI startup?", extra: { type: "human" } },
  { intent: "Who else has an apartment?" },
  { intent: "Who else can give me a ride?" },
];

const client = new Client({ name: "whoelse-http-dogfood", version: "0.2.0" });
const transport = new StreamableHTTPClientTransport(new URL(MCP_URL));
await client.connect(transport);
console.log(`HTTP MCP ${MCP_URL}`);
const { tools } = await client.listTools();
console.log(`tools: ${tools.map((t) => t.name).join(", ")}`);

for (const { intent, extra } of queries) {
  const matches = await find(client, intent, extra);
  const top = matches.slice(0, 3).map((m) => `${m.name} (${m.type} ${m.score})`).join(" · ");
  console.log(`\n${intent}\n  ${top || "(empty)"}`);
}

const pdf = await find(client, "Who else can summarize this PDF?");
const summarizer = pdf[0];
if (!summarizer) throw new Error("no summarizer");
const invokePath = summarizer.attributes?.apiEndpoint ?? `/api/agents/${summarizer.id}/invoke`;
const invokeUrl = new URL(invokePath, ORIGIN).href;
const invoked = await fetch(invokeUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ task: "summarize this PDF about DC housing" }),
});
const invokeBody = await invoked.json();
console.log(`\nagent→agent: ${summarizer.name} → POST ${invokeUrl}`);
console.log(`  ${invokeBody.would ?? JSON.stringify(invokeBody)}`);

await client.close();
