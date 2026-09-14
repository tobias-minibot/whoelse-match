import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AMAZE_PROMPTS, amazeBySlug, sharePath } from "./amaze.js";
import { WhoElseEngine } from "./engine.js";
import { WhoElseNetwork } from "./network.js";
import { findPreferLive, getPlaygroundEngine } from "./playground.js";

describe("playground fallback", () => {
  it("empty live network falls back to labeled playground and does not invent live people", async () => {
    const live = WhoElseNetwork.fromEntities([]);
    assert.equal(live.seedMode, "empty");
    assert.equal(live.engine.store.all().length, 0);

    const pooled = await findPreferLive(live, {
      context: "Who else can fix a leak under my sink before the weekend?",
      limit: 8,
    });
    assert.equal(pooled.pool, "playground");
    assert.equal(pooled.liveHits, 0);
    assert.equal(pooled.result.pool, "playground");
    assert.ok(pooled.result.candidates.length > 0);
    for (const c of pooled.result.candidates) {
      const label = String(c.entity.metadata.demoLabel ?? c.entity.provenance);
      assert.match(label, /synthetic|DEMO|ai_generated|demo/i);
    }
  });

  it("live hits win and are never mixed with playground ids", async () => {
    const playground = getPlaygroundEngine();
    const plumber = playground.store.get("service-dc-emergency-plumber");
    assert.ok(plumber);
    const liveOnly = {
      ...plumber,
      id: "live-only-plumber",
      name: "Live Only",
      provenance: "user" as const,
      metadata: { ...plumber.metadata, demoLabel: "live network", liveNetwork: true },
    };
    const live = WhoElseNetwork.fromEntities([liveOnly]);
    assert.equal(live.seedMode, "demo");

    const emptyLive = new WhoElseNetwork(WhoElseEngine.fromEntities([liveOnly]), live.identity, null, "empty");
    const pooled = await findPreferLive(emptyLive, {
      context: "Who else can fix a leak under my sink before the weekend?",
      limit: 8,
    });
    assert.equal(pooled.pool, "live");
    assert.ok(pooled.liveHits > 0);
    const ids = pooled.result.candidates.map((c) => c.entity.id);
    assert.ok(ids.includes("live-only-plumber"));
    assert.ok(!ids.some((id) => id !== "live-only-plumber" && playground.store.get(id)));
  });

  it("who else like a playground entity stays in playground", async () => {
    const live = WhoElseNetwork.fromEntities([]);
    const play = getPlaygroundEngine();
    const plumber = play.store.all().find((e) => /plumb|leak/i.test(`${e.name} ${e.description}`));
    assert.ok(plumber);
    const pooled = await findPreferLive(live, {
      context: `Who else like ${plumber.name}?`,
      entityId: plumber.id,
      exclude: [plumber.id],
      limit: 8,
    });
    assert.equal(pooled.pool, "playground");
    assert.ok(pooled.result.candidates.length > 0);
    assert.ok(!pooled.result.candidates.some((c) => c.entity.id === plumber.id));
  });

  it("demo seed mode is labeled playground, not live", async () => {
    const demo = WhoElseNetwork.fromSeed();
    const pooled = await findPreferLive(demo, { context: "Who else should I meet?", limit: 5 });
    assert.equal(pooled.pool, "playground");
    assert.equal(pooled.result.pool, "playground");
    assert.ok(pooled.result.candidates.length > 0);
  });

  it("amaze prompts compile to shareable slugs and hit the playground corpus", async () => {
    const play = getPlaygroundEngine();
    for (const prompt of AMAZE_PROMPTS) {
      assert.equal(amazeBySlug(prompt.slug)?.query, prompt.query);
      assert.equal(sharePath(prompt.query), `/who-else/${prompt.slug}`);
      const found = play.whoelse({ context: prompt.query, limit: 5 });
      assert.ok(found.candidates.length > 0, prompt.query);
    }
    assert.equal(sharePath("Who else can juggle flaming pineapples?"), "/q?q=Who+else+can+juggle+flaming+pineapples%3F");
    assert.equal(
      sharePath("Who else like Maya?", { entityId: "human-maya" }),
      "/q?q=Who+else+like+Maya%3F&like=human-maya",
    );
  });
});
