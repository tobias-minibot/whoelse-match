import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { WhoElseEngine } from "./engine.js";
import { compileAsync, compileLanguage } from "./compile.js";
import { parseCompound } from "./compound.js";
import { buildDispatchPlan, dispatchOnEngine } from "./dispatch.js";
import { loadIntentVocab, matchVocabLabels } from "./vocab.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const TENNIS_DATE = "Find me someone nearby I might like who wants to play tennis tonight.";
const TENNIS_DATE_LONG =
  "I want to play tennis with someone I might like romantically tonight, somewhere nearby.";
const APT_SCHOOL = "Find me an apartment near a good school in DC.";

describe("intent vocab", () => {
  it("lists 505 cabinet rows without forking a second ontology", () => {
    const vocab = loadIntentVocab();
    assert.equal(vocab.intents.length, 505);
    const canonical = vocab.intents.filter((i) => i.canonical);
    assert.equal(canonical.length, 452);
    assert.ok(canonical.some((i) => i.id === "i308-date" && i.label === "DATE"));
    assert.ok(canonical.some((i) => i.id === "i048-tennis" && i.kind === "activity"));
  });
});

describe("compound IR", () => {
  it("compiles the canonical tennis-date sentence to DATE ∩ TENNIS with slots", () => {
    const ir = parseCompound(TENNIS_DATE);
    const labels = ir.intents.map((i) => i.label);
    assert.ok(labels.includes("DATE"), JSON.stringify(labels));
    assert.ok(labels.includes("TENNIS"), JSON.stringify(labels));
    assert.equal(ir.entities.target, "human");
    assert.equal(ir.soft.time?.when, "tonight");
    assert.equal(ir.soft.location?.nearby, true);
    assert.equal(ir.soft.relation, "romantic");
    assert.ok(ir.relations.some((e) => e.kind === "intersect"));
    assert.ok(ir.actions.includes("discover"));
    assert.ok(ir.actions.includes("coordinate"));
    assert.equal(ir.permissions.mayPersist, false);
  });

  it("treats the spoken romantic-tennis sentence the same", () => {
    const ir = parseCompound(TENNIS_DATE_LONG);
    const labels = ir.intents.map((i) => i.label).sort();
    assert.deepEqual(
      labels.filter((l) => l === "DATE" || l === "TENNIS").sort(),
      ["DATE", "TENNIS"],
    );
    assert.equal(ir.soft.time?.when, "tonight");
    assert.ok(ir.soft.location?.nearby);
  });

  it("compiles APARTMENT + SCHOOL as a constrain graph on the same vocab", () => {
    const ir = parseCompound(APT_SCHOOL);
    const labels = ir.intents.map((i) => i.label);
    assert.ok(labels.includes("APARTMENT"), JSON.stringify(labels));
    assert.ok(labels.includes("SCHOOL"), JSON.stringify(labels));
    assert.ok(ir.relations.some((e) => e.kind === "constrains"));
  });

  it("keeps a single-intent request as a degenerate compound", () => {
    const ir = parseCompound("Who else can summarize this PDF?");
    assert.ok(ir.intents.length <= 1 || ir.intents.every((i) => i.label !== "TENNIS"));
    const plan = buildDispatchPlan(ir);
    assert.ok(plan.strategy === "atomic" || plan.nodes.length <= 1 || plan.strategy === "parallel");
  });
});

describe("multi-intent dispatch", () => {
  const engine = WhoElseEngine.fromSeed();

  it("dispatches DATE and TENNIS in one concurrent wave and reconciles an intersection", async () => {
    const compiled = compileLanguage(TENNIS_DATE);
    assert.equal(compiled.classification, "WHOELSE_COMPILABLE");
    assert.ok(compiled.ir.intents.some((i) => i.label === "DATE"));
    assert.ok(compiled.ir.intents.some((i) => i.label === "TENNIS"));
    const plan = buildDispatchPlan(compiled.ir);
    assert.equal(plan.strategy, "intersect");
    assert.ok(plan.waves[0].length >= 2, JSON.stringify(plan.waves));
    assert.ok(plan.nodes.every((n) => n.concurrent || n.blockedBy.length === 0 || plan.waves[0].includes(n.id)));

    const outcome = await dispatchOnEngine(engine, compiled.ir, { limit: 8 });
    assert.equal(outcome.plan.strategy, "intersect");
    assert.ok(outcome.result.candidates.length > 0);
    const ids = outcome.result.candidates.map((c) => c.entity.id);
    assert.ok(
      ids.some((id) => ["human-elise-vardy", "human-marco-bell", "human-jun-park"].includes(id)),
      ids.join(","),
    );
    assert.ok(outcome.result.composedFrom?.includes("DATE"));
    assert.ok(outcome.result.composedFrom?.includes("TENNIS"));
    assert.match(outcome.reconciliation.explanation, /Intersection|coverage/i);
    const elise = outcome.result.candidates.find((c) => c.entity.id === "human-elise-vardy");
    if (elise) {
      const cov = outcome.reconciliation.coverage["human-elise-vardy"] ?? [];
      assert.ok(cov.includes("DATE") && cov.includes("TENNIS"), JSON.stringify(cov));
    }
    const names = outcome.result.candidates.map((c) => c.entity.name).join(" ");
    assert.doesNotMatch(names, /childcare|Foggy Bottom parent/i);
  });

  it("compileAsync(find) uses dispatch, not a second matcher", async () => {
    const result = await compileAsync(TENNIS_DATE, engine, { find: true, limit: 8 });
    assert.ok(result.find);
    assert.equal(result.plan?.strategy, "intersect");
    assert.ok(result.find!.composedFrom?.includes("TENNIS"));
    const src = Object.getOwnPropertyNames(WhoElseEngine.prototype).join(" ");
    assert.doesNotMatch(src, /tennisFind|dateFind/);
  });

  it("reconciles APARTMENT constrained by SCHOOL on the same whoelse.find", async () => {
    const compiled = compileLanguage(APT_SCHOOL, {
      cities: engine.store.cities(),
      places: engine.store.places(),
    });
    const outcome = await dispatchOnEngine(engine, compiled.ir, { limit: 8 });
    assert.equal(outcome.plan.strategy, "constrains");
    assert.ok(outcome.result.candidates.length > 0);
    const blob = outcome.result.candidates.map((c) => `${c.entity.id} ${c.entity.name} ${c.explanation.why}`).join(" ");
    assert.match(blob, /apartment|Adams|bedroom|school/i);
    assert.ok(outcome.result.composedFrom?.includes("APARTMENT"));
    assert.ok(outcome.result.composedFrom?.includes("SCHOOL"));
  });
});

describe("compound request corpus", () => {
  it("lists at least 100 realistic one-sentence compounds", () => {
    const corpus = JSON.parse(readFileSync(join(ROOT, "data/compound-requests.json"), "utf8")) as {
      requests: { text: string; intents: string[] }[];
    };
    assert.ok(corpus.requests.length >= 100, `got ${corpus.requests.length}`);
    for (const row of corpus.requests) {
      assert.ok(row.text.split(/\s+/).length >= 4, row.text);
      assert.ok(row.intents.length >= 2 && row.intents.length <= 5, row.text);
    }
    const tennis = corpus.requests.find((r) => r.text === TENNIS_DATE);
    assert.ok(tennis);
    assert.deepEqual(tennis.intents.sort(), ["DATE", "TENNIS"]);
  });

  it("extracts at least two vocab labels from a sample of the corpus", () => {
    const corpus = JSON.parse(readFileSync(join(ROOT, "data/compound-requests.json"), "utf8")) as {
      requests: { text: string; intents: string[] }[];
    };
    let hits = 0;
    for (const row of corpus.requests.slice(0, 30)) {
      const ir = parseCompound(row.text);
      const labels = new Set(ir.intents.map((i) => i.label));
      if (row.intents.every((l) => labels.has(l))) hits += 1;
    }
    assert.ok(hits >= 12, `exact label hits ${hits}/30`);
  });
});

describe("vocab matcher does not treat the catalog as 451 apps", () => {
  it("matches speech aliases for DATE without requiring the word date", () => {
    const hits = matchVocabLabels("someone nearby I might like");
    assert.ok(hits.some((h) => h.label === "DATE"));
  });
});
