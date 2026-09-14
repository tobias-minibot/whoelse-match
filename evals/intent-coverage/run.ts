/**
 * Recompute 505-intent coverage against the live generic core.
 *
 *   pnpm coverage:505
 *
 * Writes:
 *   evals/intent-coverage/intents.json
 *   evals/intent-coverage/summary.json
 *   packages/web/src/data/universe-concepts.json
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compileLanguage } from "../../packages/core/src/compile.ts";
import { loadCatalog } from "./catalog.js";
import { classifyIntent } from "./classify.js";
import type { CoverageClass, CoverageRow, CoverageSummary } from "./types.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT_DIR = join(ROOT, "evals/intent-coverage");
const UNIVERSE_OUT = join(ROOT, "packages/web/src/data/universe-concepts.json");

function compileSnap(text: string) {
  const result = compileLanguage(text);
  return {
    classification: result.classification,
    reason: result.reason,
    confidence: result.confidence,
    locked: result.locked,
    intent: result.ir.intent,
    capability: result.seekDraft?.capability,
    constraints: result.ir.constraints as Record<string, unknown>,
  };
}

function main() {
  const catalog = loadCatalog();
  const labelCounts = new Map<string, number>();
  for (const row of catalog.intents) {
    labelCounts.set(row.label, (labelCounts.get(row.label) ?? 0) + 1);
  }

  const rows: CoverageRow[] = catalog.intents.map((intent) => {
    const classified = classifyIntent(intent);
    return {
      n: intent.n,
      id: intent.id,
      label: intent.label,
      subgroup: intent.subgroup,
      routing: intent.routing,
      catalogStatus: intent.status,
      source: intent.source,
      attested: intent.source === "attested-recitation",
      deep: intent.deep === 1,
      slots: intent.slots ?? [],
      aliasOf: intent.alias_of,
      duplicateLabel: (labelCounts.get(intent.label) ?? 0) > 1,
      class: classified.class,
      reason: classified.reason,
      extension: classified.extension,
      canonicalQuery: classified.canonicalQuery,
      paraphrases: classified.paraphrases,
      expectedIr: classified.expectedIr,
      compile: compileSnap(classified.canonicalQuery),
    };
  });

  const counts: Record<CoverageClass, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  for (const row of rows) counts[row.class] += 1;
  const total = counts.A + counts.B + counts.C + counts.D + counts.E;
  if (total !== 505) throw new Error(`classes must sum to 505, got ${total}`);

  const extMap = new Map<string, string[]>();
  for (const row of rows) {
    if (row.class !== "C" || !row.extension) continue;
    const list = extMap.get(row.extension) ?? [];
    list.push(row.id);
    extMap.set(row.extension, list);
  }
  const extensions = [...extMap.entries()]
    .map(([extension, ids]) => ({ extension, intents: ids.length, ids }))
    .sort((a, b) => b.intents - a.intents);

  const deprecations = rows
    .filter((r) => r.class === "E")
    .map((r) => ({ id: r.id, label: r.label, aliasOf: r.aliasOf, reason: r.reason }));

  const aRows = rows.filter((r) => r.class === "A");
  const dRows = rows.filter((r) => r.class === "D");
  const pick = (list: CoverageRow[], ids: string[]) => {
    const byId = new Map(list.map((r) => [r.id, r]));
    return ids
      .map((id) => byId.get(id))
      .filter((r): r is CoverageRow => Boolean(r))
      .map((r) => ({ id: r.id, reason: r.reason }));
  };

  const summary: CoverageSummary = {
    generatedAt: new Date().toISOString(),
    denominator: {
      catalog: "legacy/intent-protocol/intent-protocol.production-v0.3.compact.json",
      count: 505,
      attested: catalog.stats.source_counts["attested-recitation"] ?? 0,
      reconstructed: catalog.stats.source_counts["reconstructed-to-fill"] ?? 0,
      uniqueLabels: [...labelCounts.keys()].length,
      duplicateLabelExtraRows: catalog.stats.duplicate_label_extra_rows,
      idSkip: catalog.provenance.id_skip,
      idRange: catalog.provenance.id_range,
      note:
        "Denominator is the v0.3 compact cabinet (PR #10): 505 IDs (i001–i325, i327–i506; skip i326). 172 attested + 333 reconstructed-to-fill. Same 505 set for every count. Not the July 506 DATING-split snapshot, not protocol-v2 452+54.",
    },
    counts,
    effectiveCoverage: {
      numerator: counts.A + counts.B,
      denominator: 505,
      percent: Number((((counts.A + counts.B) / 505) * 100).toFixed(1)),
      formula: "A+B / 505",
    },
    uiLenses: ["dating", "agents", "experts"],
    extensions,
    deprecations,
    samples: {
      a: pick(aRows, ["i001-doctor", "i088-apartment", "i138-rideshare", "i177-job", "i308-date", "i385-lawyer", "i400-ai-tools"]),
      d: dRows.map((r) => ({ id: r.id, reason: r.reason })),
    },
  };

  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(dirname(UNIVERSE_OUT), { recursive: true });
  writeFileSync(join(OUT_DIR, "intents.json"), `${JSON.stringify(rows, null, 2)}\n`);
  writeFileSync(join(OUT_DIR, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  writeFileSync(
    UNIVERSE_OUT,
    `${JSON.stringify(
      {
        uiLenses: summary.uiLenses,
        counts: summary.counts,
        effectiveCoverage: summary.effectiveCoverage,
        concepts: rows.map((r) => ({
          id: r.id,
          label: r.label,
          subgroup: r.subgroup,
          class: r.class,
          extension: r.extension ?? null,
          canonicalQuery: r.canonicalQuery,
        })),
      },
      null,
      2,
    )}\n`,
  );

  const pct = summary.effectiveCoverage.percent;
  console.log(`505-intent coverage  (denominator = ${summary.denominator.count})`);
  console.log(`  A  ${counts.A} / 505`);
  console.log(`  B  ${counts.B} / 505`);
  console.log(`  C  ${counts.C} / 505`);
  console.log(`  D  ${counts.D} / 505`);
  console.log(`  E  ${counts.E} / 505`);
  console.log(`  effective coverage = A+B / 505 = ${counts.A + counts.B} / 505 = ${pct}%`);
  console.log(`  UI lenses = ${summary.uiLenses.join(" / ")}  ≠  semantic coverage`);
  console.log("C extensions:");
  for (const ext of extensions) console.log(`  ${ext.extension}: ${ext.intents}`);
  console.log(`wrote ${join(OUT_DIR, "intents.json")}`);
  console.log(`wrote ${join(OUT_DIR, "summary.json")}`);
  console.log(`wrote ${UNIVERSE_OUT}`);
}

main();
