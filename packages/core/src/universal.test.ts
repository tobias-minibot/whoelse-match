import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WhoElseEngine } from "./engine.js";
import { parseUniversal } from "./parse.js";
import { CONSTRAINT_KEY_FAMILIES, UNIVERSAL_PRIMITIVES } from "./types.js";
import { explainTrust } from "./trust.js";

const engine = WhoElseEngine.fromSeed();

describe("universal primitives", () => {
  it("keeps the proven survivor set — RELATION/STATE/VIEW are derived", () => {
    assert.deepEqual(UNIVERSAL_PRIMITIVES, [
      "ENTITY",
      "OFFER",
      "SEEK",
      "CONSTRAINT",
      "EVIDENCE",
      "ACTION",
      "MATCH",
    ]);
    assert.ok(CONSTRAINT_KEY_FAMILIES.eligibility.includes("eligible"));
    assert.ok(CONSTRAINT_KEY_FAMILIES.reservation.includes("reservation"));
    assert.ok(CONSTRAINT_KEY_FAMILIES.inventory.includes("remaining"));
    assert.ok(CONSTRAINT_KEY_FAMILIES.geo.includes("radiusKm"));
  });

  it("parses NL into side, view, hard constraints, evidence, state — not a vertical engine", () => {
    const q = parseUniversal("Who else has a 1-bedroom in DC under $2,500?");
    assert.equal(q.side, "offer");
    assert.equal(q.view, "apartment");
    assert.equal(q.soft.city, "Washington");
    assert.ok(q.hard.some((a) => a.key === "bedrooms" && a.value === 1));
    assert.ok(q.hard.some((a) => a.key === "rent" && a.op === "lte"));
    assert.equal(q.relation, "complement");

    const labor = parseUniversal("Who else can do this work for under $5,000?");
    assert.equal(labor.side, "offer");
    assert.equal(labor.view, "jobs");
    assert.deepEqual(labor.roles, ["worker"]);

    const ride = parseUniversal("Who else can give me a ride from Georgetown to Dupont?");
    assert.equal(ride.view, "rides");
    assert.ok(ride.state?.op === "neq");
    assert.ok(ride.hard.some((a) => a.key === "origin"));

    const verify = parseUniversal("Who else can verify this result?");
    assert.equal(verify.view, "capability");
    assert.ok(verify.evidenceNeeds.includes("verified"));
  });

  it("whoelse result carries the universal query", () => {
    const result = engine.whoelse({
      context: "Who else is hiring AI people in Washington?",
      limit: 3,
    });
    assert.ok(result.universal);
    assert.equal(result.inferredView, "jobs");
    assert.equal(result.universal?.view, "jobs");
    assert.deepEqual(result.universal?.roles, ["opening", "employer"]);
  });
});

describe("reciprocal SEEK↔OFFER", () => {
  it("apartment listing finds seekers", () => {
    const result = engine.reciprocal("resource-apt-dc-georgetown-1br", { limit: 5 });
    assert.equal(result.inferredConstraints.side, "seek");
    assert.ok(result.candidates.some((c) => /Kai|Marcus|Nora|Priya/i.test(c.entity.name)));
    assert.ok(engine.store.matches.some((m) => m.offerEntityId === "resource-apt-dc-georgetown-1br"));
  });

  it("job opening finds applicants", () => {
    const opening = engine.store.all().find((e) => e.attributes.role === "opening");
    assert.ok(opening);
    const result = engine.reciprocal(opening.id, { limit: 5 });
    assert.ok(result.candidates.every((c) => c.entity.attributes.role !== "opening"));
  });

  it("ride offer finds passengers or complementary seekers", () => {
    const ride = engine.store.get("ride-georgetown-dupont") ?? engine.store.all().find((e) => e.attributes.origin && e.attributes.role === "driver");
    assert.ok(ride);
    const result = engine.reciprocal(ride.id, { limit: 5 });
    assert.ok(result.candidates.every((c) => c.entity.id !== ride.id));
  });
});

describe("trust is artifacts, not a score", () => {
  it("lists licenses and outcomes without inventing a reputation number", () => {
    const plumber = engine.store.all().find((e) => e.attributes.licensed === true && e.trust?.evidence?.licenses?.length);
    assert.ok(plumber);
    const artifacts = explainTrust(plumber);
    assert.ok(artifacts.some((a) => a.kind === "license" || a.kind === "disclosure"));
    assert.ok(!artifacts.some((a) => /score|stars|rating/i.test(a.label)));
  });
});

describe("agent register + A→B delegate", () => {
  it("registers an agent that later appears in whoelse.find", () => {
    const isolated = WhoElseEngine.fromSeed();
    const registered = isolated.register({
      name: "WebCheck",
      description: "Verifies web claims for other agents.",
      offers: ["web verification", "verify this result", "verify this web claim"],
      seeks: ["unverified drafts"],
      cost: 2,
      latency: 30,
      evidence: { verified: true, verifiedBy: "owner-stub", outcomes: [{ label: "claimed-check", result: "stub" }] },
    });
    assert.equal(registered.type, "agent");
    assert.match(String(registered.attributes.apiEndpoint), /\/api\/agents\/.+\/invoke/);
    const found = isolated.whoelse({ context: "Who else can verify this web claim?", limit: 8 });
    assert.ok(
      found.candidates.some((c) => c.entity.id === registered.id),
      found.candidates.map((c) => c.entity.name).join(", "),
    );
  });

  it("headline demo: ClaimWriter cannot verify → find Checkmate → invoke → receipt", () => {
    const isolated = WhoElseEngine.fromSeed();
    isolated.ensureDemoAgents();
    const writer = isolated.store.get("agent-claim-writer");
    assert.ok(writer);
    const draft = isolated.invoke(writer.id, { task: "Georgetown to Dupont is 12 minutes by car" });
    assert.deepEqual(draft.result.cannot, ["verify"]);

    const delegated = isolated.delegate({
      from: writer.id,
      task: "Verify the claim that Georgetown to Dupont is 12 minutes by car",
      intent: "Who else can verify this result?",
      select: "evidence",
    });
    assert.equal(delegated.ok, true);
    assert.ok(delegated.selected);
    assert.match(delegated.selected.entity.name, /Checkmate/i);
    assert.equal(delegated.invoked?.agent.id, "agent-verifier");
    assert.equal(delegated.receipt?.toAgentId, "agent-verifier");
    assert.equal(delegated.receipt?.fromAgentId, writer.id);
    assert.equal(delegated.match?.status, "verified");
    assert.ok(delegated.receipt?.evidence.verified);
  });

  it("one-box website sentence infers SEEK-for-capability without a vertical tab", () => {
    const q = parseUniversal("I need someone who can redesign my website next week for under $2,000.");
    assert.equal(q.side, "offer");
    assert.deepEqual(q.roles, ["worker"]);
    assert.notEqual(q.entityType, "human");
    assert.ok(q.hard.some((a) => a.key === "rate" && a.op === "lte" && a.value === 2000));
    assert.ok(q.soft.labels?.includes("next week"));
    const result = engine.whoelse({
      context: "I need someone who can redesign my website next week for under $2,000.",
      limit: 8,
    });
    const types = new Set(result.candidates.map((c) => c.entity.type));
    assert.ok(result.candidates.length > 0);
    assert.ok(types.has("human"), `types=${[...types]}`);
    assert.ok(types.has("company"), `types=${[...types]}`);
    assert.ok(types.has("agent"), `types=${[...types]}`);
    const blob = result.candidates.map((c) => `${c.entity.name} ${c.entity.offers.join(" ")}`).join(" ");
    assert.match(blob, /website|redesign|Pia|Fleet|BudgetCoder|Cleo/i);
    for (const c of result.candidates) {
      const rate = Number(c.entity.attributes.rate ?? c.entity.attributes.priceUsd ?? 0);
      if (rate) assert.ok(rate <= 2000, `${c.entity.name} rate=${rate}`);
    }
  });

  it("does not invent datingEngine or jobsEngine", () => {
    const src = Object.getOwnPropertyNames(WhoElseEngine.prototype).join(" ");
    assert.doesNotMatch(src, /datingEngine|jobsEngine|apartmentEngine/);
  });
});
