import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WhoElseEngine } from "./engine.js";
import { NETWORK_REPUTATION_ISSUER, reputationBoost } from "./reputation.js";
import type { Entity } from "./types.js";

function twin(id: string, name: string): Entity {
  const now = new Date().toISOString();
  return {
    id,
    type: "agent",
    name,
    description:
      "Deterministic rerank twin. Offers calendar hold resolution for the WhoElse reputation demo. Same body as its pair.",
    publications: [
      {
        id: `pub-${id}-offer`,
        entityId: id,
        kind: "offer",
        capability: "calendar hold resolution",
        phrases: ["calendar hold resolution", "resolve calendar holds"],
        status: "active",
        created_at: now,
        updated_at: now,
      },
    ],
    offers: ["calendar hold resolution"],
    seeks: ["calendar hold work"],
    capabilities: ["calendar hold resolution"],
    attributes: { role: "worker", remote: true },
    preferences: {},
    metadata: { demoLabel: "synthetic rerank twin — not production" },
    provenance: "synthetic",
    trust: { status: "unscored", provenance: "synthetic" },
    created_at: now,
  };
}

describe("reputation rerank (deterministic)", () => {
  it("a successful receipt flips two otherwise similar entities", () => {
    const north = twin("agent-rerank-north", "Twin North");
    const south = twin("agent-rerank-south", "Twin South");
    const engine = WhoElseEngine.fromEntities([north, south]);
    const query = "Who else can do calendar hold resolution?";

    const before = engine.whoelse({ context: query, limit: 8 });
    const beforeNorth = before.candidates.find((c) => c.entity.id === north.id);
    const beforeSouth = before.candidates.find((c) => c.entity.id === south.id);
    assert.ok(beforeNorth && beforeSouth, "both twins must appear before receipts");
    const beforeOrder = before.candidates.map((c) => c.entity.id);
    const beforeScores = {
      north: Number(beforeNorth.score.toFixed(6)),
      south: Number(beforeSouth.score.toFixed(6)),
      northReputation: beforeNorth.explanation.scoreBreakdown.reputation ?? 0,
      southReputation: beforeSouth.explanation.scoreBreakdown.reputation ?? 0,
    };
    assert.equal(beforeScores.northReputation, 0);
    assert.equal(beforeScores.southReputation, 0);

    const match = engine.proposeMatch({
      query,
      requesterEntityId: north.id,
      candidateEntityId: south.id,
    });
    engine.store.recordReceipt({
      matchId: match.id,
      actorEntityId: north.id,
      counterpartyEntityId: south.id,
      actionType: "invoke",
      status: "completed",
      task: "resolve the hold",
      would: "complete calendar hold resolution",
      outcome: { verifiedBy: NETWORK_REPUTATION_ISSUER, result: "hold-placed" },
      result: { ok: true },
      evidence: { verified: true, verifiedBy: NETWORK_REPUTATION_ISSUER },
    });

    const southRep = engine.store.reputationOf(south.id);
    assert.equal(southRep.completed, 1);
    assert.equal(southRep.verifiedSuccesses, 1);
    assert.equal(southRep.completionReliability, 1);
    assert.ok(southRep.evidenceReceiptIds.length >= 1);
    const boost = reputationBoost(southRep);
    assert.ok(boost > 0.15, `expected material boost, got ${boost}`);

    const after = engine.whoelse({ context: query, limit: 8 });
    const afterNorth = after.candidates.find((c) => c.entity.id === north.id);
    const afterSouth = after.candidates.find((c) => c.entity.id === south.id);
    assert.ok(afterNorth && afterSouth);
    const afterScores = {
      north: Number(afterNorth.score.toFixed(6)),
      south: Number(afterSouth.score.toFixed(6)),
      northReputation: afterNorth.explanation.scoreBreakdown.reputation ?? 0,
      southReputation: afterSouth.explanation.scoreBreakdown.reputation ?? 0,
    };
    assert.ok(afterScores.south > afterScores.north, `south ${afterScores.south} should beat north ${afterScores.north}`);
    assert.ok(afterScores.southReputation > afterScores.northReputation);
    assert.equal(after.candidates[0]?.entity.id, south.id);

    // Stable numbers for the PR body.
    console.log(
      JSON.stringify({
        query,
        beforeOrder,
        beforeScores,
        afterOrder: after.candidates.map((c) => c.entity.id),
        afterScores,
        southReputation: {
          completionReliability: southRep.completionReliability,
          verifiedSuccesses: southRep.verifiedSuccesses,
          boost,
        },
      }),
    );
  });
});
