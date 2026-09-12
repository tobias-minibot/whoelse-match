import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const transport = new StdioClientTransport({
  command: "tsx",
  args: [path.join(here, "index.ts")],
});

const client = new Client({ name: "whoelse-smoke", version: "0.1.0" });
await client.connect(transport);
const { tools } = await client.listTools();
const names = tools.map((t) => t.name);
if (!names.includes("whoelse_find")) {
  throw new Error(`whoelse_find missing; got ${names.join(", ")}`);
}

const queries = [
  "Who else can summarize this PDF?",
  "Who else wants a low-key dinner and a walk?",
];
for (const context of queries) {
  const result = await client.callTool({
    name: "whoelse_find",
    arguments: { context, limit: 5 },
  });
  const text = (result.content as { type: string; text?: string }[])
    .filter((c) => c.type === "text")
    .map((c) => c.text ?? "")
    .join("\n");
  const parsed = JSON.parse(text) as { candidates: { entity: { name: string; type: string } }[] };
  if (!parsed.candidates?.length) throw new Error(`empty result for ${context}`);
  console.log(
    context,
    "→",
    parsed.candidates.map((c) => `${c.entity.type}:${c.entity.name}`).join(", "),
  );
}
await client.close();
console.log("mcp smoke ok");
