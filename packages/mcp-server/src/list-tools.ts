import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));

const transport = new StdioClientTransport({
  command: "tsx",
  args: [path.join(here, "index.ts")],
});

const client = new Client({ name: "whoelse-tool-lister", version: "0.1.0" });
await client.connect(transport);
const { tools } = await client.listTools();
for (const tool of tools) {
  console.log(`${tool.name} — ${tool.description ?? ""}`);
}
await client.close();
