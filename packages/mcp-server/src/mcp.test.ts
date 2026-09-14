import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { DEMO_OWNER_KEY } from "@whoelse/core";
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
    ["Who else can give me a ride?", /Ride|transport|Airport|Dupont|Moab|seats/i],
    ["Who else has a furnished apartment in Berlin under €2000?", /Berlin|Mitte|furnished|sublet/i],
    ["Who else is looking for a 2-bedroom in DC?", /Ben|Dupont|Adams|2-bedroom/i],
    ["Who else is hiring AI people in Washington?", /Northwind|opening|AI engineer/i],
    ["Who else can do this work for under $5,000?", /Aisha|BudgetCoder|Cleo|Imani/i],
    ["Who else can give me a ride from Georgetown to Dupont?", /Georgetown|Dupont|Ride/i],
    ["Who else can fix a leak under my sink before the weekend?", /Leak|Plumber|Shaw/i],
    ["Who else has a cheaper equivalent 18V drill in stock?", /drill|Brushless|Harbor/i],
    ["Who else invests and writes $250k checks?", /Pat|Anacostia|invest/i],
    ["Who else has a room tonight in Berlin?", /Berlin|Mitte|hostel|stay/i],
    ["Who else can babysit tonight nearby?", /babysit|Priya|childcare/i],
    ["I need help understanding this market.", /market|Mira|dataset|Watchers|Socrates/i],
    ["Who else can do calendar hold resolution?", /Holdwright|calendar hold/i],
  ];

describe("MCP whoelse.find", () => {
  let client: Client;

  before(async () => {
    const transport = new StdioClientTransport({
      command: "tsx",
      args: [path.join(here, "index.ts")],
      env: { ...process.env, WHOELSE_SEED: "demo", WHOELSE_AGENT_KEY: DEMO_OWNER_KEY },
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
    assert.ok(names.includes("whoelse.register"));
    assert.ok(names.includes("whoelse.publish"));
    assert.ok(names.includes("whoelse.delegate"));
    assert.ok(names.includes("whoelse.match"));
    assert.ok(names.includes("whoelse.act"));
    assert.ok(names.includes("whoelse.receipt"));
    assert.ok(names.includes("whoelse.reputation"));
    assert.ok(!names.some((n) => /apartment|jobs\.|rides\.|services\./i.test(n)), `no vertical tool: ${names.join(", ")}`);
  });

  it("registers then finds then delegates without a vertical tool", async () => {
    const registered = await client.callTool({
      name: "whoelse.register",
      arguments: {
        name: "ClaimCheck Mini",
        description: "Tiny verifier for MCP register demo.",
        offers: ["verify this result", "web verification"],
      },
    });
    const regText = (registered.content as { type: string; text?: string }[])
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("\n");
    const reg = JSON.parse(regText) as { entity: { id: string; name: string } };
    assert.match(reg.entity.name, /ClaimCheck Mini/);

    const published = await client.callTool({
      name: "whoelse.publish",
      arguments: {
        entityId: reg.entity.id,
        publications: [{ kind: "offer", capability: "verify this result", phrases: ["web verification"] }],
      },
    });
    const pubText = (published.content as { type: string; text?: string }[])
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("\n");
    const pub = JSON.parse(pubText) as { ok?: boolean; entity?: { id: string } };
    assert.equal(pub.ok, true);
    assert.equal(pub.entity?.id, reg.entity.id);

    const delegated = await client.callTool({
      name: "whoelse.delegate",
      arguments: {
        task: "Verify the claim that Georgetown to Dupont is 12 minutes",
        intent: "Who else can verify this result?",
        from: "agent-web-browser",
        select: "evidence",
      },
    });
    const delText = (delegated.content as { type: string; text?: string }[])
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("\n");
    const del = JSON.parse(delText) as { ok: boolean; selected?: { name: string }; receipt?: { id: string } };
    assert.equal(del.ok, true);
    assert.ok(del.selected?.name);
    assert.ok(del.receipt?.id);
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

  it("find with InboxClerk requester returns the Holdwright pair", async () => {
    const result = await client.callTool({
      name: "whoelse.find",
      arguments: {
        intent: "Who else can do calendar hold resolution?",
        requester: "agent-inbox-clerk",
        limit: 8,
      },
    });
    const text = (result.content as { type: string; text?: string }[])
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("\n");
    const body = JSON.parse(text) as {
      matches: { id: string; name: string }[];
      pairs: { offerId: string; seekId: string; offerEntityId: string; seekEntityId: string }[];
    };
    assert.ok(body.matches.some((m) => m.id === "agent-holdwright"));
    assert.ok(
      body.pairs.some(
        (p) => p.offerEntityId === "agent-holdwright" && p.seekEntityId === "agent-inbox-clerk",
      ),
      JSON.stringify(body.pairs),
    );
  });

  it("closes the loop: match → act → receipt → reputation → find from match", async () => {
    const proposed = await client.callTool({
      name: "whoelse.match",
      arguments: {
        requesterEntityId: "agent-inbox-clerk",
        candidateEntityId: "agent-holdwright",
        query: "Who else can do calendar hold resolution?",
      },
    });
    const proposedText = (proposed.content as { type: string; text?: string }[])
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("\n");
    const matchBody = JSON.parse(proposedText) as { match?: { id: string }; error?: string };
    assert.ok(matchBody.match?.id, proposedText);

    const acted = await client.callTool({
      name: "whoelse.act",
      arguments: { matchId: matchBody.match.id, action: "accept", actorEntityId: "agent-holdwright" },
    });
    const actText = (acted.content as { type: string; text?: string }[])
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("\n");
    const actBody = JSON.parse(actText) as { match?: { status: string } };
    assert.equal(actBody.match?.status, "accepted");

    const rec = await client.callTool({
      name: "whoelse.reputation",
      arguments: { entityId: "agent-holdwright" },
    });
    const recText = (rec.content as { type: string; text?: string }[])
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("\n");
    const rep = JSON.parse(recText) as { evidenceReceiptIds?: string[]; issuer?: string };
    assert.equal(rep.issuer, "whoelse-network");
    assert.ok((rep.evidenceReceiptIds?.length ?? 0) >= 1);

    const again = await client.callTool({
      name: "whoelse.find",
      arguments: { matchId: matchBody.match.id, limit: 5 },
    });
    const againText = (again.content as { type: string; text?: string }[])
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("\n");
    const found = JSON.parse(againText) as { matches: { id: string }[] };
    const ids = found.matches.map((m) => m.id);
    assert.ok(!ids.includes("agent-inbox-clerk"));
    assert.ok(!ids.includes("agent-holdwright"));
  });
});
