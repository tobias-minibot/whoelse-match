import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { CatalogIntent } from "./types.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
export const CATALOG_PATH = join(
  ROOT,
  "legacy/intent-protocol/intent-protocol.production-v0.3.compact.json",
);

export type CompactCatalog = {
  schema: string;
  version: string;
  provenance: {
    attested: { rows: string };
    fill: { method: string };
    received: number;
    expected: number;
    id_skip: string[];
    id_range: string;
  };
  stats: {
    received: number;
    expected: number;
    source_counts: Record<string, number>;
    duplicate_label_extra_rows: number;
    by_subgroup: Record<string, number>;
  };
  intents: CatalogIntent[];
};

export function loadCatalog(): CompactCatalog {
  const data = JSON.parse(readFileSync(CATALOG_PATH, "utf8")) as CompactCatalog;
  if (data.intents.length !== 505) {
    throw new Error(`catalog must contain 505 intents, got ${data.intents.length}`);
  }
  if (data.stats.received !== 505 || data.provenance.received !== 505) {
    throw new Error("catalog provenance.received must be 505");
  }
  const ids = new Set(data.intents.map((i) => i.id));
  if (ids.size !== 505) throw new Error("catalog IDs must be unique");
  if (ids.has("i326")) throw new Error("catalog must skip i326 (DATE fold hole)");
  return data;
}

export function prettyLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/\b1st\b/g, "first")
    .replace(/\bai\b/g, "AI");
}
