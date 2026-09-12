import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));

const CASES: [string, RegExp][] = [
  ["Who else can summarize this PDF?", /Summarizer|pdf/i],
  ["Who else can browse the web?", /Browsewright|brows/i],
  ["Who else can translate German to English?", /Bridge|translat/i],
  ["Who else can verify this result?", /Checkmate|verif/i],
  ["Who else can run this task more cheaply?", /ThriftWorker|cheap/i],
  ["Who else can execute this workflow?", /Flowhand|workflow/i],
  ["Who else can take over if the primary agent fails?", /Understudy|failover/i],
  ["Who else exposes this capability?", /CapIndex|capability/i],
  ["Who else should I delegate to?", /Hand-off|delegat/i],
  ["Who else should I date?", /Riley|Harper|Theo|dinner/i],
  ["Who else should I meet?", /Sam|Nia|Nova|Jordan/i],
    ["Who else has an apartment?", /apartment|Adams/i],
    ["Who else can give me a ride?", /Ride|transport/i],
    ["Who else has a furnished apartment in Berlin under €2000?", /Berlin|Mitte|furnished|sublet/i],
    ["Who else is looking for a 2-bedroom in DC?", /Ben|Dupont|Adams|2-bedroom/i],
  ];

describe("MCP whoelse.find", () => {
  let client: Client;

  before(async () => {
    const transport = new StdioClientTransport({
      command: "tsx",
      args: [path.join(here, "index.ts")],
    });
    client = new Client({ name: "whoelse-mcp-test", version: "0.1.0" });
    await client.connect(transport);
  });

  after(async () => {
    await client.close();
  });

  it("lists whoelse.find as the primary tool", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    assert.ok(names.includes("whoelse.find"), `tools: ${names.join(", ")}`);
    assert.ok(!names.some((n) => /apartment/i.test(n)), `no apartment-only tool: ${names.join(", ")}`);
  });

  for (const [intent, expect] of CASES) {
    it(`structured result: ${intent}`, async () => {
      const result = await client.callTool({
        name: "whoelse.find",
        arguments: { intent, limit: 5 },
      });
      const text = (result.content as { type: string; text?: string }[])
        .filter((c) => c.type === "text")
        .map((c) => c.text ?? "")
        .join("\n");
      const body = JSON.parse(text) as {
        matches: {
          id: string;
          type: string;
          name: string;
          description: string;
          score: number;
          why: string;
          trust: { status: string; provenance: string };
          next: { action: string };
        }[];
      };
      assert.ok(body.matches?.length, "empty matches");
      const first = body.matches[0];
      assert.ok(first.id && first.type && first.name && first.description);
      assert.equal(typeof first.score, "number");
      assert.ok(first.why);
      assert.ok(first.trust?.provenance);
      assert.ok(first.next?.action);
      const blob = body.matches.map((m) => `${m.type} ${m.name} ${m.why}`).join(" ");
      assert.match(blob, expect, blob);
    });
  }
});
