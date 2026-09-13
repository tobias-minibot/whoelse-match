import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { bootNetwork } from "./boot.js";
import {
  gatewayAffirm,
  gatewayFeedback,
  gatewayFind,
  gatewayOnboard,
  gatewayPublish,
  gatewayRegister,
} from "./gateway.js";
import { WhoElseNetwork } from "./network.js";
import { applyMigrations, type SqlClient } from "./persist/client.js";
import { PostgresRepository } from "./persist/repository.js";
import { assertNoPrivateLeak, toOwnerEntity, toPublicEntity } from "./public-dto.js";
import { AGE_AFFIRMATION_VERSION, isPubliclyFindable } from "./visibility.js";

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

describe("human onboarding + launch safety", () => {
  it("onboarding creates an owned human entity and first-class publications", async () => {
    const network = WhoElseNetwork.fromEntities([]);
    const caller = network.identity.upsertClerkHuman("user_onboard_ada", "Ada");
    const result = await gatewayOnboard(
      network,
      {
        name: "Ada Chen",
        description: "Human building in public. Looking for a thoughtful match.",
        seeks: [{ capability: "romantic compatibility", phrases: ["dating"] }],
        offers: [{ capability: "good conversation" }],
      },
      caller,
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const entity = result.body.entity;
    assert.equal(entity.type, "human");
    assert.equal(entity.metadata.kindLabel, "human");
    assert.equal(entity.metadata.humanNotAi, true);
    assert.equal(entity.metadata.aiDisclosure, undefined);
    assert.equal(entity.visibility, "private");
    assert.equal(entity.ageAffirmed, false);
    assert.ok(entity.publications?.some((p) => p.kind === "seek" && p.capability === "romantic compatibility"));
    assert.ok(network.identity.owns(caller.principalId, entity.id));
    assert.equal(network.identity.ownersOf(entity.id)[0], caller.principalId);
    assertNoPrivateLeak(entity);
    assert.equal("preferences" in entity, false);
  });

  it("unaffirmed humans cannot appear in public find; affirmation makes them findable", async () => {
    const network = WhoElseNetwork.fromEntities([]);
    const caller = network.identity.upsertClerkHuman("user_hidden_rio");
    const created = await gatewayOnboard(
      network,
      {
        name: "Rio Vale",
        description: "Quiet dinners and long walks. Seeks romantic compatibility.",
        seeks: ["romantic compatibility"],
      },
      caller,
    );
    assert.equal(created.ok, true);
    const entityId = created.ok ? created.body.entity.id : "";
    assert.ok(network.engine.store.get(entityId));
    assert.equal(isPubliclyFindable(network.engine.store.get(entityId)!), false);

    const hidden = await gatewayFind(network, { context: "Who else seeks romantic compatibility?", limit: 12 }, null);
    assert.equal(hidden.ok, true);
    if (hidden.ok) {
      assert.ok(!hidden.body.candidates.some((c) => c.entity.id === entityId));
      assertNoPrivateLeak(hidden.body);
    }

    const affirmed = await gatewayAffirm(network, caller, { version: AGE_AFFIRMATION_VERSION });
    assert.equal(affirmed.ok, true);
    if (affirmed.ok) {
      assert.equal(affirmed.body.ageAffirmed, true);
      assert.equal(affirmed.body.findable, true);
      assert.ok(!JSON.stringify(affirmed.body).includes("ageAffirmedAt"));
    }
    const stored = network.engine.store.get(entityId)!;
    assert.equal(isPubliclyFindable(stored), true);
    assert.equal(stored.metadata.visibility, "public");
    const dating = stored.publications?.find((p) => p.capability === "romantic compatibility");
    assert.equal(dating?.status, "active");

    const shown = await gatewayFind(network, { context: "Who else seeks romantic compatibility?", limit: 12 }, null);
    assert.equal(shown.ok, true);
    if (shown.ok) {
      assert.ok(
        shown.body.candidates.some((c) => c.entity.id === entityId),
        shown.body.candidates.map((c) => c.entity.name).join(", "),
      );
      assertNoPrivateLeak(shown.body);
    }
  });

  it("rate limit trips on register / publish / withdraw / feedback", async () => {
    const network = WhoElseNetwork.fromEntities([]);
    const caller = network.identity.upsertClerkHuman("user_rate");
    network.rateLimit.limits.register.max = 1;
    network.rateLimit.limits.publish.max = 1;
    network.rateLimit.limits.withdraw.max = 1;
    network.rateLimit.limits.feedback.max = 1;

    const first = await gatewayRegister(
      network,
      { name: "Rate One", description: "first", type: "human", seeks: ["quiet evenings"] },
      caller,
    );
    assert.equal(first.ok, true);
    const second = await gatewayRegister(
      network,
      { name: "Rate Two", description: "second", type: "human", seeks: ["quiet evenings"] },
      caller,
    );
    assert.equal(second.status, 429);

    const entityId = first.ok ? first.body.entity.id : "";
    network.rateLimit.limits.publish.max = 1;
    const pub1 = await gatewayPublish(
      network,
      entityId,
      [{ kind: "offer", capability: "good conversation" }],
      caller,
    );
    assert.equal(pub1.ok, true);
    const pub2 = await gatewayPublish(
      network,
      entityId,
      [{ kind: "offer", capability: "weekend availability" }],
      caller,
    );
    assert.equal(pub2.status, 429);

    const fb1 = await gatewayFeedback(network, { entityId, signal: "more" }, caller);
    assert.equal(fb1.ok, true);
    const fb2 = await gatewayFeedback(network, { entityId, signal: "less" }, caller);
    assert.equal(fb2.status, 429);

    const wd1 = await gatewayPublish(
      network,
      entityId,
      [{ kind: "offer", capability: "good conversation", status: "withdrawn" }],
      caller,
    );
    assert.equal(wd1.ok, true);
    const wd2 = await gatewayPublish(
      network,
      entityId,
      [{ kind: "seek", capability: "quiet evenings", status: "withdrawn" }],
      caller,
    );
    assert.equal(wd2.status, 429);
  });

  it("anonymous writes are 401 and cross-owner stays 403", async () => {
    const network = WhoElseNetwork.fromEntities([]);
    const owner = network.identity.upsertClerkHuman("user_owner");
    const other = network.identity.upsertClerkHuman("user_other");
    const created = await gatewayOnboard(
      network,
      { name: "Owner", description: "mine", seeks: ["romantic compatibility"] },
      owner,
    );
    assert.equal(created.ok, true);
    const entityId = created.ok ? created.body.entity.id : "";

    assert.equal(
      (await gatewayOnboard(network, { name: "Ghost", description: "nope", seeks: ["x"] }, null)).status,
      401,
    );
    assert.equal(
      (await gatewayPublish(network, entityId, [{ kind: "seek", capability: "romantic compatibility" }], null)).status,
      401,
    );
    assert.equal((await gatewayAffirm(network, null)).status, 401);
    assert.equal((await gatewayFeedback(network, { entityId, signal: "more" }, null)).status, 401);

    const cross = await gatewayPublish(
      network,
      entityId,
      [{ kind: "seek", capability: "romantic compatibility", status: "withdrawn" }],
      other,
    );
    assert.equal(cross.status, 403);

    const crossAffirm = await gatewayOnboard(
      network,
      { name: "Hijack", description: "no", seeks: ["romantic compatibility"] },
      other,
    );
    assert.equal(crossAffirm.ok, true);
    if (crossAffirm.ok) assert.notEqual(crossAffirm.body.entity.id, entityId);
  });

  it("public DTOs never dump preferences or affirmation internals", async () => {
    const network = WhoElseNetwork.fromEntities([]);
    const caller = network.identity.upsertClerkHuman("user_dto");
    await gatewayOnboard(
      network,
      { name: "Pat", description: "human, not an AI", seeks: ["romantic compatibility"], affirmAge: true },
      caller,
    );
    const entity = network.engine.store.get(`human-${caller.principalId}`);
    assert.ok(entity);
    entity.preferences = { datingIntent: "secret-intent", pace: "slow" };
    entity.metadata.ageAffirmedAt = "2099-01-01T00:00:00.000Z";
    entity.metadata.ageAffirmationVersion = "v1";
    entity.metadata.clerkUserId = "user_dto";
    const pub = toPublicEntity(entity);
    const owner = toOwnerEntity(entity);
    assert.equal("preferences" in pub, false);
    assert.equal("preferences" in owner, false);
    assert.equal(pub.metadata.ageAffirmedAt, undefined);
    assert.equal(pub.metadata.ageAffirmationVersion, undefined);
    assert.equal(pub.metadata.clerkUserId, undefined);
    assert.equal(pub.metadata.kindLabel, "human");
    assertNoPrivateLeak(pub);
    assertNoPrivateLeak(owner);
    assert.ok(!JSON.stringify(pub).includes("secret-intent"));
    assert.ok(!JSON.stringify(owner).includes("2099-01-01"));
  });

  it("onboarding + affirmation survive a postgres restart", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "whoelse-onboard-"));
    const first = await openRepo(dir);
    const net1 = await bootNetwork({ persist: first.repo, seedMode: "empty" });
    const caller = net1.identity.upsertClerkHuman("user_durable_human", "Kim");
    const created = await gatewayOnboard(
      net1,
      { name: "Kim", description: "Durable human on Neon.", seeks: ["romantic compatibility"] },
      caller,
    );
    assert.equal(created.ok, true);
    const entityId = created.ok ? created.body.entity.id : "";
    await first.client.close();

    const second = await openRepo(dir);
    const net2 = await bootNetwork({ persist: second.repo, seedMode: "empty" });
    const loaded = net2.engine.store.get(entityId);
    assert.ok(loaded);
    assert.equal(loaded.name, "Kim");
    assert.equal(isPubliclyFindable(loaded), false);
    const human = net2.identity.upsertClerkHuman("user_durable_human", "Kim");
    await gatewayAffirm(net2, human);
    await second.client.close();

    const third = await openRepo(dir);
    const net3 = await bootNetwork({ persist: third.repo, seedMode: "empty" });
    const again = net3.engine.store.get(entityId);
    assert.ok(again);
    assert.equal(isPubliclyFindable(again), true);
    assert.equal(net3.identity.isAgeAffirmed(human.principalId), true);
    await third.client.close();
  });

  it("agents still register without an age gate", async () => {
    const network = WhoElseNetwork.fromEntities([]);
    const agent = network.identity.createPrincipal({ kind: "agent", displayName: "bot" });
    const key = network.identity.issueKey(agent.id);
    const caller = network.authenticateAgentKey(key.token);
    const created = await gatewayRegister(
      network,
      { name: "Toolwright", description: "offers ics repair", offers: ["ics conflict resolution"] },
      caller,
    );
    assert.equal(created.ok, true);
    if (created.ok) {
      assert.equal(created.body.entity.type, "agent");
      assert.ok(isPubliclyFindable(network.engine.store.get(created.body.entity.id)!));
    }
    const humanTry = await gatewayOnboard(
      network,
      { name: "Nope", description: "agent cannot onboard as human", seeks: ["x"] },
      caller,
    );
    assert.equal(humanTry.status, 403);
  });
});
