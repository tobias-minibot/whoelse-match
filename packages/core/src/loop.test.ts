import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { WhoElseEngine } from "./engine.js";
import {
  gatewayAct,
  gatewayFind,
  gatewayProposeMatch,
  gatewayReputation,
  gatewayWriteReceipt,
} from "./gateway.js";
import { DEMO_INTRUDER_KEY, DEMO_OWNER_KEY, IdentityLedger } from "./identity.js";
import { WhoElseNetwork } from "./network.js";
import { applyMigrations, type SqlClient } from "./persist/client.js";
import { PostgresRepository } from "./persist/repository.js";

function pgliteSql(client: PGlite): SqlClient {
  return {
    async query<T>(text: string, params: unknown[] = []) {
      const result = await client.query<T>(text, params);
      if (Array.isArray(result)) return result;
      const rows = (result as { rows?: T[] }).rows;
      return Array.isArray(rows) ? rows : [];
    },
    async exec(text: string) {
      await client.exec(text);
    },
  };
}

describe("closed network loop", () => {
  it("find does not write MATCH; propose + act + receipt + recursive find do", async () => {
    const network = WhoElseNetwork.fromSeed();
    const owner = network.authenticateAgentKey(DEMO_OWNER_KEY);
    const found = await gatewayFind(
      network,
      { context: "Who else can do calendar hold resolution?", requester: "agent-inbox-clerk", limit: 8 },
      owner,
    );
    assert.equal(found.ok, true);
    assert.equal(network.engine.store.matches.length, 0, "find must not persist MATCH");

    const proposed = await gatewayProposeMatch(
      network,
      {
        requesterEntityId: "agent-inbox-clerk",
        candidateEntityId: "agent-holdwright",
        query: "Who else can do calendar hold resolution?",
      },
      owner,
    );
    assert.equal(proposed.ok, true);
    if (!proposed.ok) return;
    const matchId = proposed.body.match.id;
    assert.equal(proposed.body.match.status, "proposed");
    assert.ok(proposed.body.receipt.id);

    const accepted = await gatewayAct(network, { matchId, action: "accept", actorEntityId: "agent-holdwright" }, owner);
    assert.equal(accepted.ok, true);
    if (!accepted.ok) return;
    assert.equal(accepted.body.match.status, "accepted");

    const invoked = await gatewayAct(
      network,
      { matchId, action: "invoke", actorEntityId: "agent-inbox-clerk", task: "place the Friday hold" },
      owner,
    );
    assert.equal(invoked.ok, true);
    if (!invoked.ok) return;
    assert.equal(invoked.body.receipt.actionType, "invoke");
    assert.ok(invoked.body.receipt.status === "completed" || invoked.body.receipt.status === "failed");

    const messaged = await gatewayAct(
      network,
      { matchId, action: "message", actorEntityId: "agent-inbox-clerk", message: "Hold is on the calendar." },
      owner,
    );
    assert.equal(messaged.ok, true);
    if (!messaged.ok) return;
    assert.ok(messaged.body.message?.body.includes("Hold is on"));

    const recursive = await gatewayFind(network, { matchId, limit: 8 }, owner);
    assert.equal(recursive.ok, true);
    if (!recursive.ok) return;
    const ids = recursive.body.candidates.map((c) => c.entity.id);
    assert.ok(!ids.includes("agent-inbox-clerk"));
    assert.ok(!ids.includes("agent-holdwright"));

    const rep = await gatewayReputation(network, "agent-holdwright", owner);
    assert.equal(rep.ok, true);
    if (!rep.ok) return;
    assert.ok(rep.body.completed >= 1);
    assert.ok(rep.body.evidenceReceiptIds.length >= 1);
    assert.equal(rep.body.issuer, "whoelse-network");
  });

  it("anonymous propose is 401 and cross-owner act is 403", async () => {
    const network = WhoElseNetwork.fromSeed();
    const owner = network.authenticateAgentKey(DEMO_OWNER_KEY);
    const proposed = await gatewayProposeMatch(
      network,
      { requesterEntityId: "agent-inbox-clerk", candidateEntityId: "agent-holdwright", query: "hold" },
      owner,
    );
    assert.equal(proposed.ok, true);
    const anon = await gatewayProposeMatch(
      network,
      { requesterEntityId: "agent-inbox-clerk", candidateEntityId: "agent-holdwright", query: "hold" },
      null,
    );
    assert.equal(anon.status, 401);

    const intruder = network.authenticateAgentKey(DEMO_INTRUDER_KEY);
    if (!proposed.ok) return;
    const cross = await gatewayAct(network, { matchId: proposed.body.match.id, action: "accept" }, intruder);
    assert.equal(cross.status, 403);
  });

  it("receipt write updates durable reputation in Postgres", async () => {
    const client = new PGlite();
    const sql = pgliteSql(client);
    await applyMigrations(sql);
    const repo = new PostgresRepository(sql);
    const engine = WhoElseEngine.fromSeed();
    const network = new WhoElseNetwork(
      engine,
      IdentityLedger.forSyntheticSeed(engine.store.all().map((e) => e.id)),
      repo,
      "demo",
    );

    const owner = network.authenticateAgentKey(DEMO_OWNER_KEY);
    const written = await gatewayWriteReceipt(
      network,
      {
        actorEntityId: "agent-inbox-clerk",
        counterpartyEntityId: "agent-holdwright",
        actionType: "invoke",
        status: "completed",
        outcome: { verifiedBy: "whoelse-network" },
      },
      owner,
    );
    assert.equal(written.ok, true);
    const loop = await repo.loadLoop();
    assert.ok(loop.receipts.length >= 1);
    assert.ok(loop.reputations.some((r) => r.entityId === "agent-holdwright" && r.completed >= 1));
  });
});
