import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WhoElseEngine } from "./engine.js";

const engine = WhoElseEngine.fromSeed();

describe("seed integrity", () => {
  it("has at least 20 synthetic humans and 10 labeled AIs", () => {
    const humans = engine.store.all().filter((e) => e.type === "human");
    const ais = engine.store.all().filter((e) => e.type === "ai");
    assert.ok(humans.length >= 20, `humans=${humans.length}`);
    assert.ok(ais.length >= 10, `ais=${ais.length}`);
    for (const h of humans) {
      assert.equal(h.provenance, "synthetic");
      assert.equal(h.attributes.synthetic, true);
      assert.equal(h.metadata.demo, true);
      assert.match(String(h.metadata.demoLabel), /synthetic/i);
    }
    for (const a of ais) {
      assert.ok(a.provenance === "ai_generated" || a.metadata.isAI === true);
      assert.match(String(a.metadata.aiDisclosure), /AI/i);
      assert.notEqual(a.type, "human");
    }
  });

  it("includes required AI personas", () => {
    const names = engine.store.all().filter((e) => e.type === "ai").map((e) => e.name);
    for (const need of ["Nova", "Socrates", "FounderBot"]) {
      assert.ok(names.includes(need), `missing ${need}`);
    }
  });

  it("gives every entity offers and seeks; type is open-ended", () => {
    for (const e of engine.store.all()) {
      assert.ok(e.offers.length > 0, `${e.id} missing offers`);
      assert.ok(e.seeks.length > 0, `${e.id} missing seeks`);
      assert.ok(e.trust?.status, `${e.id} missing trust stub`);
    }
    const types = new Set(engine.store.all().map((e) => e.type));
    assert.ok(types.has("human") && types.has("ai") && types.has("agent"));
    assert.ok(types.has("resource") && types.has("service"));
  });
});

describe("WHOELSE", () => {
  it("returns plausible voice-network matches in the first 5", () => {
    const result = engine.whoelse({
      context: "Who else wants to build a network of voice assistants?",
      limit: 5,
    });
    assert.equal(result.candidates.length, 5);
    const blob = result.candidates
      .map((c) => `${c.entity.name} ${c.entity.description} ${c.entity.capabilities.join(" ")}`)
      .join(" ")
      .toLowerCase();
    assert.match(blob, /voice/);
    assert.ok(result.candidates.some((c) => c.entity.type === "human"));
    assert.ok(result.candidates.some((c) => c.entity.type === "ai"));
    for (const c of result.candidates) {
      assert.ok(c.explanation.why.length > 0);
    }
  });

  it("keeps DC bike people near the top for a local ride query", () => {
    const result = engine.whoelse({
      context: "Who else near me is into mountain biking?",
      limit: 5,
    });
    const names = result.candidates.map((c) => c.entity.name);
    assert.ok(
      names.some((n) => /Jordan|Carmen|Trail/i.test(n)),
      `unexpected top names: ${names.join(", ")}`,
    );
    assert.equal(result.inferredConstraints.city, "Washington");
  });

  it("recursive more-like excludes the exemplar and stays in-cluster", () => {
    const sam = engine.store.all().find((e) => e.name === "Sam Okonkwo");
    assert.ok(sam);
    const result = engine.moreLike(sam.id, { limit: 5 });
    assert.ok(result.candidates.every((c) => c.entity.id !== sam.id));
    assert.notEqual(result.inferredConstraints.type, "ai");
    const names = result.candidates.map((c) => c.entity.name);
    assert.ok(
      names.some((n) => /Nia|Leo|Handoff|Open Voice|Founder|Sasha/i.test(n)),
      `unexpected more-like set: ${names.join(", ")}`,
    );
    assert.ok(result.candidates.some((c) => c.entity.type === "human"));
    assert.ok(
      names.filter((n) => /Jonah|Riley|Chris Adeyemi/i.test(n)).length === 0,
      `off-cluster leaked into more-like: ${names.join(", ")}`,
    );
  });

  it("honors an explicit AI-only request without treating 'agents' as a type lock", () => {
    const onlyAi = engine.whoelse({ context: "Who else is an AI that can help with voice assistants?", limit: 5 });
    assert.equal(onlyAi.inferredConstraints.type, "ai");
    assert.ok(onlyAi.candidates.every((c) => c.entity.type === "ai"));
    const mixed = engine.whoelse({ context: "Who else works on federated agents and voice assistants?", limit: 5 });
    assert.notEqual(mixed.inferredConstraints.type, "ai");
  });

  it("records less-like feedback and ranks that entity lower", () => {
    const isolated = WhoElseEngine.fromSeed();
    const first = isolated.whoelse({
      context: "Who else wants to build a network of voice assistants?",
      limit: 5,
    });
    const target = first.candidates[0].entity.id;
    isolated.feedback(target, "less", "Who else wants to build a network of voice assistants?");
    const again = isolated.whoelse({
      context: "Who else wants to build a network of voice assistants?",
      limit: 5,
    });
    const before = first.candidates.find((c) => c.entity.id === target)!.score;
    const after = again.candidates.find((c) => c.entity.id === target)?.score ?? -1;
    assert.ok(after < before);
  });
});

describe("same primitive, other verticals", () => {
  const cases: [string, RegExp][] = [
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
  ];

  for (const [query, expect] of cases) {
    it(`ranks a plausible entity for: ${query}`, () => {
      const result = engine.whoelse({ context: query, limit: 5 });
      assert.ok(result.candidates.length > 0);
      const blob = result.candidates
        .map((c) => `${c.entity.type} ${c.entity.name} ${c.entity.offers.join(" ")} ${c.entity.description}`)
        .join(" ");
      assert.match(blob, expect, blob);
      assert.ok(result.byType);
    });
  }
});
