import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { loadCatalog } from "./catalog.js";
import { classifyIntent } from "./classify.js";
import type { CoverageRow, CoverageSummary } from "./types.js";

const HERE = dirname(fileURLToPath(import.meta.url));

describe("505-intent coverage suite", () => {
  const catalog = loadCatalog();
  const rows = catalog.intents.map((intent) => ({ intent, classified: classifyIntent(intent) }));

  it("uses the v0.3 compact cabinet of exactly 505 IDs", () => {
    assert.equal(catalog.intents.length, 505);
    assert.equal(catalog.provenance.received, 505);
    assert.deepEqual(catalog.provenance.id_skip, ["i326"]);
    assert.equal(catalog.stats.source_counts["attested-recitation"], 172);
    assert.equal(catalog.stats.source_counts["reconstructed-to-fill"], 333);
  });

  it("classifies every row; A–E sum to 505", () => {
    const counts = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    for (const { classified, intent } of rows) {
      counts[classified.class] += 1;
      assert.ok(classified.canonicalQuery.length > 3, intent.id);
      assert.ok(classified.paraphrases.length >= 3, intent.id);
      assert.ok(classified.expectedIr.capability, intent.id);
    }
    assert.equal(counts.A + counts.B + counts.C + counts.D + counts.E, 505);
    assert.ok(counts.A > 0 && counts.B > 0 && counts.D > 0 && counts.E > 0);
    assert.ok(counts.C === 0, `C should be empty after eligibility/reservation/radius/remaining: C=${counts.C}`);
    assert.ok(counts.A + counts.B >= 436, `A+B=${counts.A + counts.B}`);
  });

  it("marks alias_of rows E and does not treat UI lenses as the denominator", () => {
    const aliases = rows.filter((r) => r.intent.alias_of);
    assert.ok(aliases.length >= 50);
    for (const { classified } of aliases) assert.equal(classified.class, "E");
    const date = rows.find((r) => r.intent.id === "i308-date");
    const doctor = rows.find((r) => r.intent.id === "i001-doctor");
    const recipe = rows.find((r) => r.intent.id === "i073-recipe");
    const water = rows.find((r) => r.intent.id === "i081-water");
    const restaurant = rows.find((r) => r.intent.id === "i060-restaurant");
    const bank = rows.find((r) => r.intent.id === "i157-bank");
    const parking = rows.find((r) => r.intent.id === "i136-parking");
    const ambulance = rows.find((r) => r.intent.id === "i021-ambulance");
    assert.equal(date?.classified.class, "A");
    assert.equal(doctor?.classified.class, "A");
    assert.equal(recipe?.classified.class, "D");
    assert.equal(water?.classified.class, "E");
    assert.equal(restaurant?.classified.class, "A");
    assert.equal(bank?.classified.class, "A");
    assert.equal(parking?.classified.class, "A");
    assert.equal(ambulance?.classified.class, "A");
    assert.equal(restaurant?.classified.extension, undefined);
  });

  it("committed artifacts match a fresh classify", () => {
    const intents = JSON.parse(readFileSync(join(HERE, "intents.json"), "utf8")) as CoverageRow[];
    const summary = JSON.parse(readFileSync(join(HERE, "summary.json"), "utf8")) as CoverageSummary;
    assert.equal(intents.length, 505);
    const fresh = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    for (const { classified } of rows) fresh[classified.class] += 1;
    assert.deepEqual(summary.counts, fresh);
    assert.equal(summary.effectiveCoverage.numerator, fresh.A + fresh.B);
    assert.equal(summary.effectiveCoverage.denominator, 505);
    assert.deepEqual(summary.uiLenses, ["dating", "agents", "experts"]);
    assert.equal(summary.extensions.length, 0);
    const bank = intents.find((r) => r.id === "i157-bank");
    const restaurant = intents.find((r) => r.id === "i060-restaurant");
    const parking = intents.find((r) => r.id === "i136-parking");
    const ambulance = intents.find((r) => r.id === "i021-ambulance");
    assert.ok(bank?.compile?.constraints?.attributes && Array.isArray(bank.compile.constraints.attributes));
    assert.ok(
      (bank.compile.constraints.attributes as { key: string }[]).some((a) => a.key === "eligible"),
    );
    assert.ok(
      (restaurant?.compile?.constraints?.attributes as { key: string }[])?.some((a) => a.key === "reservation"),
    );
    assert.ok(
      (parking?.compile?.constraints?.attributes as { key: string }[])?.some((a) => a.key === "remaining"),
    );
    assert.equal(ambulance?.compile?.constraints?.radiusKm, 5);
  });
});
