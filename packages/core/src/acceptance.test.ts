import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { AuthzError } from "./authz.js";
import { bootNetwork, seedDemo } from "./boot.js";
import {
  gatewayDelegate,
  gatewayFeedback,
  gatewayFind,
  gatewayInvoke,
  gatewayPublish,
  gatewayRegister,
  gatewayRevokeAgentKey,
  gatewayRotateAgentKey,
} from "./gateway.js";
import {
  DEMO_INTRUDER_KEY,
  DEMO_OWNER_KEY,
  IdentityLedger,
  SYNTHETIC_OWNER_PRINCIPAL_ID,
} from "./identity.js";
import { WhoElseNetwork } from "./network.js";
import { applyMigrations, type SqlClient } from "./persist/client.js";
import { PostgresRepository } from "./persist/repository.js";
import { assertNoPrivateLeak, toPublicEntity, toPublicWhoElseResult } from "./public-dto.js";
import { resolveSeedMode } from "./seed-policy.js";
import { WhoElseEngine } from "./engine.js";

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

async function openRepo(dataDir?: string) {
  const client = dataDir ? new PGlite(dataDir) : new PGlite();
  const sql = pgliteSql(client);
  await applyMigrations(sql);
  return { client, repo: new PostgresRepository(sql) };
}

describe("acceptance: durable principals and owned writes", () => {
  it("1. anonymous writes → 401; cross-owner writes → 403", async () => {
    const network = WhoElseNetwork.fromSeed();
    const anon = await gatewayRegister(
      network,
      { name: "Ghost", description: "no auth", offers: ["nothing"] },
      null,
    );
    assert.equal(anon.status, 401);

    const owner = network.authenticateAgentKey(DEMO_OWNER_KEY);
    const created = await gatewayRegister(
      network,
      { name: "Mine", description: "owned worker", offers: ["owned capability"] },
      owner,
    );
    assert.equal(created.ok, true);
    const entityId = created.ok ? created.body.entity.id : "";

    const intruder = network.authenticateAgentKey(DEMO_INTRUDER_KEY);
    const cross = await gatewayPublish(
      network,
      entityId,
      [{ kind: "offer", capability: "owned capability", status: "withdrawn" }],
      intruder,
    );
    assert.equal(cross.status, 403);
  });

  it("2. cannot register over existing ID or impersonate type", async () => {
    const network = WhoElseNetwork.fromSeed();
    const owner = network.authenticateAgentKey(DEMO_OWNER_KEY);
    const first = await gatewayRegister(
      network,
      { id: "agent-unique-launch", name: "Once", description: "first", offers: ["once"] },
      owner,
    );
    assert.equal(first.ok, true);
    const again = await gatewayRegister(
      network,
      { id: "agent-unique-launch", name: "Twice", description: "nope", offers: ["twice"] },
      owner,
    );
    assert.equal(again.status, 409);

    const spoofAi = await gatewayRegister(
      network,
      { name: "FakeNova", description: "not an AI", type: "ai", offers: ["persona"] },
      owner,
    );
    assert.equal(spoofAi.status, 403);

    const human = network.identity.upsertClerkHuman("user_test_human");
    const spoofFromHuman = await gatewayRegister(
      network,
      { name: "Pretend AI", description: "no", type: "ai", offers: ["chat"] },
      human,
    );
    assert.equal(spoofFromHuman.status, 403);

    const agentAsHuman = await gatewayRegister(
      network,
      { name: "Not a person", description: "no", type: "human", offers: ["dating"] },
      owner,
    );
    assert.equal(agentAsHuman.status, 403);
  });

  it("3. revoked agent keys fail; missing session is 401", async () => {
    const network = WhoElseNetwork.fromSeed();
    const owner = network.authenticateAgentKey(DEMO_OWNER_KEY);
    assert.ok(owner);
    const minted = network.identity.createPrincipal({ kind: "agent", displayName: "rotator" });
    const issued = network.identity.issueKey(minted.id);
    const caller = network.authenticateAgentKey(issued.token);
    assert.ok(caller);
    const revoked = await gatewayRevokeAgentKey(network, caller, issued.keyId);
    assert.equal(revoked.ok, true);
    assert.equal(network.authenticateAgentKey(issued.token), null);
    const after = await gatewayRegister(
      network,
      { name: "Nope", description: "revoked", offers: ["x"] },
      network.authenticateAgentKey(issued.token),
    );
    assert.equal(after.status, 401);

    const fresh = network.identity.issueKey(network.identity.createPrincipal({ kind: "agent", displayName: "spin" }).id);
    const before = network.authenticateAgentKey(fresh.token);
    assert.ok(before);
    await gatewayRotateAgentKey(network, before, fresh.keyId);
    assert.equal(network.authenticateAgentKey(fresh.token), null);
  });

  it("4. entity/publication changes survive restart; idempotent writes no duplicates", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "whoelse-pg-"));
    const first = await openRepo(dir);
    const net1 = await bootNetwork({ persist: first.repo, seedMode: "empty" });
    const agent = net1.identity.createPrincipal({ kind: "agent", displayName: "durable" });
    const key = net1.identity.issueKey(agent.id);
    const caller = net1.authenticateAgentKey(key.token);
    const created = await gatewayRegister(
      net1,
      { id: "agent-durable-1", name: "Durable", description: "lives in postgres", offers: ["durability"] },
      caller,
    );
    assert.equal(created.ok, true);
    const pub1 = await gatewayPublish(
      net1,
      "agent-durable-1",
      [{ kind: "offer", capability: "durability", phrases: ["survive restart"] }],
      caller,
    );
    const pub2 = await gatewayPublish(
      net1,
      "agent-durable-1",
      [{ kind: "offer", capability: "durability", phrases: ["survive restart"] }],
      caller,
    );
    assert.equal(pub1.ok && pub2.ok, true);
    const pubs = net1.engine.store.get("agent-durable-1")?.publications ?? [];
    assert.equal(pubs.filter((p) => p.capability === "durability").length, 1);

    await first.client.close();
    const second = await openRepo(dir);
    const net2 = await bootNetwork({ persist: second.repo, seedMode: "empty" });
    const again = net2.engine.store.get("agent-durable-1");
    assert.ok(again);
    assert.equal(again.name, "Durable");
    assert.ok(again.publications?.some((p) => p.capability === "durability"));
    assert.ok(net2.identity.owns(agent.id, "agent-durable-1"));
    await second.client.close();
  });

  it("5. withdrawal is durable and excluded from find", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "whoelse-wd-"));
    const first = await openRepo(dir);
    const net1 = await bootNetwork({ persist: first.repo, seedMode: "empty" });
    const agent = net1.identity.createPrincipal({ kind: "agent", displayName: "hold" });
    const key = net1.identity.issueKey(agent.id);
    const caller = net1.authenticateAgentKey(key.token);
    await gatewayRegister(
      net1,
      {
        id: "agent-withdraw-hold",
        name: "HoldClone",
        description: "offers calendar hold resolution",
        offers: [{ capability: "calendar hold resolution" }],
      },
      caller,
    );
    const before = net1.engine.whoelse({
      context: "Who else can do calendar hold resolution?",
      limit: 8,
    });
    assert.ok(before.candidates.some((c) => c.entity.id === "agent-withdraw-hold"));
    await gatewayPublish(
      net1,
      "agent-withdraw-hold",
      [{ kind: "offer", capability: "calendar hold resolution", status: "withdrawn" }],
      caller,
    );
    await first.client.close();

    const second = await openRepo(dir);
    const net2 = await bootNetwork({ persist: second.repo, seedMode: "empty" });
    const pub = net2.engine.store.get("agent-withdraw-hold")?.publications?.find(
      (p) => p.capability === "calendar hold resolution",
    );
    assert.equal(pub?.status, "withdrawn");
    const after = net2.engine.whoelse({
      context: "Who else can do calendar hold resolution?",
      limit: 8,
    });
    const hit = after.candidates.find((c) => c.entity.id === "agent-withdraw-hold");
    assert.ok(!after.pairs.some((p) => p.offerEntityId === "agent-withdraw-hold"));
    assert.ok(hit?.matched?.offer?.capability !== "calendar hold resolution");
    await second.client.close();
  });

  it("6. requester spoofing is rejected", async () => {
    const network = WhoElseNetwork.fromSeed();
    const anon = await gatewayFind(
      network,
      { context: "Who else can do calendar hold resolution?", requester: "agent-inbox-clerk" },
      null,
    );
    assert.equal(anon.status, 401);
    const intruder = network.authenticateAgentKey(DEMO_INTRUDER_KEY);
    const spoof = await gatewayFind(
      network,
      { context: "Who else can do calendar hold resolution?", requester: "agent-inbox-clerk" },
      intruder,
    );
    assert.equal(spoof.status, 403);
    const owner = network.authenticateAgentKey(DEMO_OWNER_KEY);
    const ok = await gatewayFind(
      network,
      { context: "Who else can do calendar hold resolution?", requester: "agent-inbox-clerk", limit: 8 },
      owner,
    );
    assert.equal(ok.ok, true);
  });

  it("7. public APIs never expose private prefs/credentials/ownership internals", async () => {
    const engine = WhoElseEngine.fromSeed();
    const entity = engine.store.get("human-sam-okonkwo");
    assert.ok(entity);
    entity.preferences = { datingIntent: "secret", pace: "slow" };
    entity.metadata.ownerPrincipalId = SYNTHETIC_OWNER_PRINCIPAL_ID;
    entity.attributes.authRequirements = "bearer-secret";
    const pub = toPublicEntity(entity);
    assert.equal("preferences" in pub, false);
    assert.equal(pub.metadata.ownerPrincipalId, undefined);
    assert.equal(pub.attributes.authRequirements, undefined);
    assertNoPrivateLeak(pub);
    const result = engine.whoelse({ context: "Who else should I meet?", limit: 5 });
    assertNoPrivateLeak(toPublicWhoElseResult(result));
  });

  it("8. production starts empty unless explicitly seeded; demo records labeled synthetic", async () => {
    assert.equal(resolveSeedMode({ VERCEL_ENV: "production" }), "empty");
    assert.equal(resolveSeedMode({ VERCEL_ENV: "production", WHOELSE_SEED: "demo" }), "demo");
    assert.equal(resolveSeedMode({ NODE_ENV: "test" }), "demo");
    const empty = await bootNetwork({ seedMode: "empty" });
    assert.equal(empty.engine.store.all().length, 0);
    const demo = WhoElseNetwork.fromSeed();
    for (const e of demo.engine.store.all()) {
      const label = String(e.metadata.demoLabel ?? e.provenance);
      assert.match(label, /synthetic|DEMO|ai_generated|demo/i);
    }
    assert.equal(demo.identity.principals.get(SYNTHETIC_OWNER_PRINCIPAL_ID)?.synthetic, true);
  });

  it("9. migration-from-empty smoke", async () => {
    const { client, repo } = await openRepo();
    const tables = await repo.client.query<{ tablename?: string; table_name?: string }>(
      `SELECT table_name AS tablename FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`,
    );
    const names = tables.map((t) => String(t.tablename ?? t.table_name ?? ""));
    for (const need of [
      "principals",
      "accounts",
      "agent_credentials",
      "entities",
      "ownership",
      "publications",
      "write_audit",
      "rate_counters",
    ]) {
      assert.ok(names.includes(need), `missing ${need}: ${names.join(",")}`);
    }
    assert.equal(await repo.entityCount(), 0);
    await client.close();
  });

  it("10. owner / anonymous / cross-tenant via the shared gateway (API contract)", async () => {
    const network = WhoElseNetwork.fromSeed();
    const owner = network.authenticateAgentKey(DEMO_OWNER_KEY);
    const intruder = network.authenticateAgentKey(DEMO_INTRUDER_KEY);
    const created = await gatewayRegister(
      network,
      { name: "TenantA", description: "owner only", offers: ["tenant-a-capability"] },
      owner,
    );
    assert.equal(created.ok, true);
    const id = created.ok ? created.body.entity.id : "";

    assert.equal((await gatewayFeedback(network, { entityId: id, signal: "more" }, null)).status, 401);
    assert.equal((await gatewayInvoke(network, "agent-holdwright", { task: "x" }, null)).status, 401);
    assert.equal((await gatewayDelegate(network, { task: "x", from: "agent-inbox-clerk" }, null)).status, 401);
    assert.equal(
      (await gatewayPublish(network, id, [{ kind: "offer", capability: "tenant-a-capability" }], null)).status,
      401,
    );
    assert.equal(
      (await gatewayPublish(network, id, [{ kind: "offer", capability: "tenant-a-capability" }], intruder)).status,
      403,
    );
    assert.equal(
      (await gatewayDelegate(network, { task: "x", from: "agent-inbox-clerk" }, intruder)).status,
      403,
    );
    const owned = await gatewayPublish(
      network,
      id,
      [{ kind: "offer", capability: "tenant-a-capability", phrases: ["again"] }],
      owner,
    );
    assert.equal(owned.ok, true);
    if (owned.ok) assertNoPrivateLeak(owned.body);
  });
});

describe("identity + seed helpers", () => {
  it("hashes keys and never returns the plaintext twice from storage", () => {
    const ledger = IdentityLedger.empty();
    const agent = ledger.createPrincipal({ kind: "agent", displayName: "k" });
    const issued = ledger.issueKey(agent.id);
    const stored = [...ledger.credentials.values()][0];
    assert.ok(stored);
    assert.notEqual(stored.keyHash, issued.token);
    assert.equal(ledger.authenticateAgentKey(issued.token)?.principalId, agent.id);
    assert.throws(() => ledger.issueKey(ledger.createPrincipal({ kind: "human" }).id), AuthzError);
  });

  it("seedDemo writes labeled fixtures into an empty database", async () => {
    const { client, repo } = await openRepo();
    await seedDemo(repo);
    assert.ok((await repo.entityCount()) > 20);
    const identity = IdentityLedger.fromSnapshot(await repo.loadIdentity());
    assert.equal(identity.principals.get(SYNTHETIC_OWNER_PRINCIPAL_ID)?.synthetic, true);
    await client.close();
  });
});
