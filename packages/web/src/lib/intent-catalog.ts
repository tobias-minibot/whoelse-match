import universe from "@/data/universe-concepts.json";
import { aliasesFor, type SearchableIntent } from "@whoelse/core/vocab-search";

export type UniverseConcept = {
  id: string;
  label: string;
  subgroup: string;
  class: string;
  extension: string | null;
  canonicalQuery: string;
};

export const UNIVERSE_CONCEPTS: UniverseConcept[] = universe.concepts as UniverseConcept[];

/** Canonical labels for typeahead — skip duplicate/obsolete E rows when a live row exists. */
export const INTENT_CATALOG: SearchableIntent[] = (() => {
  const byLabel = new Map<string, SearchableIntent>();
  for (const row of UNIVERSE_CONCEPTS) {
    const next: SearchableIntent = {
      id: row.id,
      label: row.label,
      category: row.subgroup,
      coverage: row.class,
      question: row.canonicalQuery,
      aliases: aliasesFor(row.label),
      canonical: row.class !== "E",
    };
    const prev = byLabel.get(row.label);
    if (!prev || (prev.coverage === "E" && next.coverage !== "E")) {
      byLabel.set(row.label, next);
    }
  }
  return [...byLabel.values()];
})();

export function conceptToSearchable(row: UniverseConcept): SearchableIntent {
  return {
    id: row.id,
    label: row.label,
    category: row.subgroup,
    coverage: row.class,
    question: row.canonicalQuery,
    aliases: aliasesFor(row.label),
    canonical: row.class !== "E",
  };
}
