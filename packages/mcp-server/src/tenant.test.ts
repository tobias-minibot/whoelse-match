import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { DEMO_INTRUDER_KEY, DEMO_OWNER_KEY, WhoElseNetwork, assertNoPrivateLeak } from "@whoelse/core";
import { createWhoElseMcpServer } from "./create-server.js";

async function connect(network: WhoElseNetwork, token?: string) {
  const caller = token ? network.authenticateAgentKey(token) : null;
  const server = createWhoElseMcpServer(network, { caller });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "tenant-test", version: "0.1.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { client, server };
}

function parse(result: { content: { type: string; text?: string }[] }) {
  const text = result.content
    .filter((c) => c.type === "text")
    .map((c) => c.text ?? "")
    .join("\n");
  return JSON.parse(text) as Record<string, unknown>;
}

describe("MCP owner / anonymous / cross-tenant", () => {
  const network = WhoElseNetwork.fromSeed();
  let owner: Client;
  let anon: Client;
  let intruder: Client;
  let ownerServer: { close(): Promise<void> };
  let anonServer: { close(): Promise<void> };
  let intruderServer: { close(): Promise<void> };

  before(async () => {
    const a = await connect(network, DEMO_OWNER_KEY);
    const b = await connect(network);
    const c = await connect(network, DEMO_INTRUDER_KEY);
    owner = a.client;
    anon = b.client;
    intruder = c.client;
    ownerServer = a.server;
    anonServer = b.server;
    intruderServer = c.server;
  });

  after(async () => {
    await owner.close();
    await anon.close();
    await intruder.close();
    await ownerServer.close();
    await anonServer.close();
    await intruderServer.close();
  });

  it("anonymous find is allowed and stays public", async () => {
    const result = await anon.callTool({
      name: "whoelse.find",
      arguments: { intent: "Who else can summarize this PDF?", limit: 3 },
    });
    const body = parse(result as { content: { type: string; text?: string }[] });
    assert.ok(Array.isArray(body.matches) && body.matches.length > 0);
    assertNoPrivateLeak(body);
  });

  it("anonymous register / publish / requester → 401", async () => {
    const reg = parse(
      (await anon.callTool({
        name: "whoelse.register",
        arguments: { name: "Nope", description: "anon", offers: ["x"] },
      })) as { content: { type: string; text?: string }[] },
    );
    assert.equal(reg.status, 401);

    const pub = parse(
      (await anon.callTool({
        name: "whoelse.publish",
        arguments: {
          entityId: "agent-holdwright",
          publications: [{ kind: "offer", capability: "calendar hold resolution", status: "withdrawn" }],
        },
      })) as { content: { type: string; text?: string }[] },
    );
    assert.equal(pub.status, 401);

    const spoof = parse(
      (await anon.callTool({
        name: "whoelse.find",
        arguments: { intent: "Who else can do calendar hold resolution?", requester: "agent-inbox-clerk" },
      })) as { content: { type: string; text?: string }[] },
    );
    assert.equal(spoof.status, 401);
  });

  it("cross-tenant publish and requester → 403; owner succeeds", async () => {
    const created = parse(
      (await owner.callTool({
        name: "whoelse.register",
        arguments: { name: "Tenant MCP", description: "owned via MCP", offers: ["mcp-tenant-capability"] },
      })) as { content: { type: string; text?: string }[] },
    );
    assert.equal(created.ok, true);
    const entity = created.entity as { id: string };
    const cross = parse(
      (await intruder.callTool({
        name: "whoelse.publish",
        arguments: {
          entityId: entity.id,
          publications: [{ kind: "offer", capability: "mcp-tenant-capability", status: "withdrawn" }],
        },
      })) as { content: { type: string; text?: string }[] },
    );
    assert.equal(cross.status, 403);

    const requester = parse(
      (await intruder.callTool({
        name: "whoelse.find",
        arguments: { intent: "Who else can do calendar hold resolution?", requester: "agent-inbox-clerk" },
      })) as { content: { type: string; text?: string }[] },
    );
    assert.equal(requester.status, 403);

    const ok = parse(
      (await owner.callTool({
        name: "whoelse.publish",
        arguments: {
          entityId: entity.id,
          publications: [{ kind: "offer", capability: "mcp-tenant-capability", phrases: ["again"] }],
        },
      })) as { content: { type: string; text?: string }[] },
    );
    assert.equal(ok.ok, true);
    assertNoPrivateLeak(ok);
  });
});
