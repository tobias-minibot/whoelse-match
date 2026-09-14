/**
 * Derive the shared WhoElse intent vocabulary from the 505 cabinet + coverage
 * audit. Vocab is dispatch labels — not a list of products to build.
 *
 *   npx tsx scripts/build-intent-vocab.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const KIND_BY_SUBGROUP: Record<string, string> = {
  "BODY & HEALTH": "service",
  "FITNESS & SPORT": "activity",
  "FOOD & DRINK": "service",
  "HOME & LIVING": "entity",
  "TRANSPORT & MOBILITY": "service",
  "FINANCE": "service",
  "WORK": "need",
  "EDUCATION": "need",
  "CULTURE": "activity",
  "FAMILY": "need",
  "BEAUTY": "service",
  PETS: "service",
  FASHION: "entity",
  "SOCIAL & COMMUNITY": "need",
  ENV: "need",
  TRAVEL: "entity",
  CREATIVE: "activity",
  LEGAL: "service",
  "DIGITAL & TECH": "service",
  EVENTS: "activity",
  LOCAL: "entity",
  MISC: "atomic",
};

const KIND_BY_LABEL: Record<string, string> = {
  DATE: "need",
  FRIEND: "need",
  TENNIS: "activity",
  APARTMENT: "entity",
  SCHOOL: "need",
  FLIGHT: "entity",
  HOTEL: "entity",
  JOB: "need",
  "REMOTE WORK": "need",
  RESTAURANT: "service",
  DOCTOR: "service",
};

type CatalogIntent = {
  n: number;
  id: string;
  label: string;
  subgroup: string;
  routing: string;
  status: string;
  deep: number;
  slots: string[];
  source: string;
  alias_of?: string;
};

type CoverageRow = { id: string; class: string; duplicateLabel: boolean; aliasOf?: string };

const catalog = JSON.parse(
  readFileSync(join(ROOT, "legacy/intent-protocol/intent-protocol.production-v0.3.compact.json"), "utf8"),
) as { intents: CatalogIntent[]; provenance: unknown; stats: { received: number } };

const coverage = JSON.parse(readFileSync(join(ROOT, "evals/intent-coverage/intents.json"), "utf8")) as CoverageRow[];
const coverageById = new Map(coverage.map((r) => [r.id, r]));

const firstByLabel = new Map<string, string>();
for (const intent of catalog.intents) {
  if (intent.alias_of) continue;
  if (!firstByLabel.has(intent.label)) firstByLabel.set(intent.label, intent.id);
}

const intents = catalog.intents.map((intent) => {
  const cov = coverageById.get(intent.id);
  const canonicalId = firstByLabel.get(intent.label);
  const canonical = !intent.alias_of && canonicalId === intent.id;
  const kind = KIND_BY_LABEL[intent.label] ?? KIND_BY_SUBGROUP[intent.subgroup] ?? "atomic";
  return {
    id: intent.id,
    n: intent.n,
    label: intent.label,
    category: intent.subgroup,
    routing: intent.routing,
    kind,
    compose: !intent.alias_of && (cov?.class === "A" || cov?.class === "B" || !cov),
    coverage: cov?.class ?? null,
    canonical,
    aliasOf: intent.alias_of ?? (canonical ? undefined : canonicalId),
    slots: intent.slots ?? [],
    source: intent.source,
    catalogStatus: intent.status,
  };
});

const vocab = {
  schema: "whoelse.intent-vocab.v1",
  generatedAt: new Date().toISOString().slice(0, 10),
  note: "Shared intent vocabulary for humans and AIs. Not a list of products to build. One NL request may mention many of these labels; WhoElse compiles a compound graph and dispatches on one core.",
  provenance: {
    cabinet: "legacy/intent-protocol/intent-protocol.production-v0.3.compact.json",
    cabinetCount: catalog.intents.length,
    uniqueLabels: firstByLabel.size,
    coverage: "evals/intent-coverage/intents.json",
    humanProductCsv:
      "451-row product catalog (Category, Who Else? Question, Source Label, Original #, Status, Routing). Overlapping Source Labels map onto these IDs. Do not fork a second ontology.",
  },
  kinds: ["atomic", "entity", "activity", "need", "service"],
  compose: {
    intersect: "Same-person / same-entity (DATE ∩ TENNIS)",
    constrains: "One intent's slots filter another (SCHOOL constrains APARTMENT)",
    sequence: "Ordered plan (FLIGHT → HOTEL)",
    parallel: "Independent subrequests, then merge",
    depends: "B waits on A's output",
    fallback: "B if A is empty",
  },
  intents,
};

const outDir = join(ROOT, "data");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "intent-vocab.json");
writeFileSync(outPath, `${JSON.stringify(vocab, null, 2)}\n`);
console.log(`wrote ${outPath} (${intents.length} rows, ${firstByLabel.size} unique labels)`);
