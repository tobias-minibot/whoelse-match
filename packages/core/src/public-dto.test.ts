import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WhoElseEngine } from "./engine.js";
import { toMachineFindResult } from "./machine.js";
import { assertNoPrivateLeak, toPublicEntity } from "./public-dto.js";

describe("public DTOs", () => {
  it("strips preferences and credential-adjacent fields from MCP machine matches", () => {
    const engine = WhoElseEngine.fromSeed();
    const sam = engine.store.get("human-sam-okonkwo");
    assert.ok(sam);
    sam.preferences = { datingIntent: "private" };
    sam.attributes.authRequirements = "secret";
    const found = engine.whoelse({ context: "Who else should I meet?", limit: 5 });
    const machine = toMachineFindResult(found);
    assertNoPrivateLeak(machine);
    assert.ok(!JSON.stringify(machine).includes("datingIntent"));
    assert.ok(!JSON.stringify(toPublicEntity(sam)).includes("datingIntent"));
  });

  it("strips age-affirmation internals and never dumps preferences", () => {
    const engine = WhoElseEngine.fromSeed();
    const sam = engine.store.get("human-sam-okonkwo");
    assert.ok(sam);
    sam.preferences = { datingIntent: "hidden", pace: "slow" };
    sam.metadata.ageAffirmedAt = "2026-01-01T00:00:00.000Z";
    sam.metadata.ageAffirmationVersion = "v1";
    const pub = toPublicEntity(sam);
    assertNoPrivateLeak(pub);
    assert.equal(pub.metadata.ageAffirmedAt, undefined);
    assert.ok(!JSON.stringify(pub).includes("2026-01-01"));
  });
});
