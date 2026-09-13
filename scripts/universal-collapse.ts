#!/usr/bin/env npx tsx
/**
 * Laboratory: rerun reconstructed legacy intents through parseUniversal.
 * Not a product. Writes scripts output to stdout + docs/universal-collapse.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { WhoElseEngine } from "../packages/core/src/engine.ts";
import { parseUniversal } from "../packages/core/src/parse.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const mapping = JSON.parse(readFileSync(join(ROOT, "legacy-intent-mapping.json"), "utf8")) as {
  intents: { id: string; name: string; category: string; human_phrase: string; whoelse_find: { intent: string } }[];
};

const engine = WhoElseEngine.fromSeed();
const SAMPLE = [
  "DATE",
  "DATING",
  "APARTMENT",
  "JOB",
  "RIDESHARE",
  "PLUMBER",
  "PDF_SUMMARIZER",
  "WEB_BROWSER",
  "VERIFIER",
  "FAILOVER",
  "DELEGATE",
  "DENTIST",
  "NOTARY",
  "CYCLING",
];

type Row = {
  id: string;
  phrase: string;
  view?: string;
  side?: string;
  clean: boolean;
  seeded: boolean;
  needs: string[];
};

const rows: Row[] = [];
for (const intent of mapping.intents) {
  const phrase = intent.whoelse_find?.intent || intent.human_phrase;
  const q = parseUniversal(phrase, engine.store.cities(), undefined, engine.store.places());
  const must = SAMPLE.includes(intent.id) || SAMPLE.includes(intent.name);
  if (!must && rows.length > 80) continue;
  const result = engine.whoelse({ context: phrase, limit: 3 });
  const seeded = result.candidates.length > 0 && result.candidates[0].score > 0.06;
  const needs: string[] = [];
  if (!q.view && !q.side) needs.push("ambiguous-noun");
  if (!seeded) needs.push("missing-supply");
  if (/\bcalendar|book|pay|checkout\b/i.test(phrase)) needs.push("transaction-not-owned");
  rows.push({
    id: intent.id || intent.name,
    phrase,
    view: q.view,
    side: q.side,
    clean: Boolean(q.view || q.side || q.hard.length),
    seeded,
    needs,
  });
}

const clean = rows.filter((r) => r.clean).length;
const seeded = rows.filter((r) => r.seeded).length;
const summary = {
  n: rows.length,
  clean,
  seeded,
  collapse: "506 (claimed) → 1 operator (whoelse.find) + CONSTRAINT + optional EVIDENCE/STATE/ACTION",
  primitives: ["ENTITY", "OFFER", "SEEK", "CONSTRAINT", "EVIDENCE", "STATE", "ACTION", "MATCH"],
  rows: rows.slice(0, 60),
};

writeFileSync(join(ROOT, "docs/universal-collapse.json"), JSON.stringify(summary, null, 2));
console.log(`collapse sample n=${summary.n} clean=${clean} seeded=${seeded}`);
console.log(summary.collapse);
