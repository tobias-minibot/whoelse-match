import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SPEECH_ALIASES,
  aliasesFor,
  prettyLabel,
  searchIntents,
  speechForms,
  type IntentSearchHit,
  type IntentSearchOptions,
  type SearchableIntent,
} from "./vocab-search.js";

export type { IntentSearchHit, IntentSearchOptions, SearchableIntent } from "./vocab-search.js";
export {
  SPEECH_ALIASES,
  aliasesFor,
  intentQuestion,
  prettyLabel,
  refineWhoElseQuery,
  searchIntents,
  speechForms,
} from "./vocab-search.js";

export type IntentKind = "atomic" | "entity" | "activity" | "need" | "service";

export interface VocabIntent {
  id: string;
  n: number;
  label: string;
  category: string;
  routing: string;
  kind: IntentKind;
  compose: boolean;
  coverage: string | null;
  canonical: boolean;
  aliasOf?: string;
  slots: string[];
  source: string;
  catalogStatus?: string;
}

export interface IntentVocab {
  schema: string;
  note: string;
  provenance: Record<string, unknown>;
  kinds: IntentKind[];
  intents: VocabIntent[];
}

const STOP_LABELS = new Set([
  "THE",
  "AND",
  "FOR",
  "WITH",
  "WHO",
  "ELSE",
  "THIS",
  "THAT",
  "FROM",
  "HAVE",
  "WANT",
  "NEED",
  "FIND",
  "LIKE",
  "PLAY",
  "MEET",
  "CARE",
  "HELP",
  "WORK",
  "TIME",
  "PLACE",
  "HOME",
  "ROOM",
  "PEOPLE",
  "PERSON",
  "SOMEONE",
  "NEARBY",
  "TONIGHT",
  "TODAY",
  "WATER",
  "APP",
  "AI",
]);

const STOP_TOKENS = new Set(
  [...STOP_LABELS].map((s) => s.toLowerCase()).concat(["the", "and", "for", "with", "near", "good"]),
);

let cached: IntentVocab | undefined;
let byLabelCache: Map<string, VocabIntent> | undefined;
let uniqueTokenCache: Map<string, VocabIntent> | undefined;

function findVocabPath(): string | undefined {
  if (process.env.WHOELSE_VOCAB_PATH && existsSync(process.env.WHOELSE_VOCAB_PATH)) {
    return process.env.WHOELSE_VOCAB_PATH;
  }
  const here = path.dirname(fileURLToPath(import.meta.url));
  const nearby = [
    path.join(here, "../../../data/intent-vocab.json"),
    path.join(here, "../../data/intent-vocab.json"),
    path.join(here, "../data/intent-vocab.json"),
    path.join(process.cwd(), "data/intent-vocab.json"),
  ];
  for (const candidate of nearby) {
    if (existsSync(candidate)) return candidate;
  }
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    const candidate = path.join(dir, "data", "intent-vocab.json");
    if (existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
}

export function loadIntentVocab(): IntentVocab {
  if (cached) return cached;
  const file = findVocabPath();
  if (!file) {
    throw new Error("Could not find data/intent-vocab.json. Run `npx tsx scripts/build-intent-vocab.ts`.");
  }
  cached = JSON.parse(readFileSync(file, "utf8")) as IntentVocab;
  if (!Array.isArray(cached.intents) || cached.intents.length !== 505) {
    throw new Error(`intent-vocab must list 505 rows, got ${cached.intents.length}`);
  }
  return cached;
}

export function canonicalVocab(): VocabIntent[] {
  return loadIntentVocab().intents.filter((i) => i.canonical);
}

export function vocabByLabel(label: string): VocabIntent | undefined {
  if (!byLabelCache) {
    byLabelCache = new Map();
    for (const intent of canonicalVocab()) byLabelCache.set(intent.label, intent);
  }
  return byLabelCache.get(label.toUpperCase());
}

export interface VocabHit {
  id: string;
  label: string;
  kind: IntentKind;
  category: string;
  confidence: number;
  matched: string;
}

function escapeReg(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function asPhrase(label: string): string {
  return prettyLabel(label);
}

function asSearchable(intent: VocabIntent): SearchableIntent {
  return {
    id: intent.id,
    label: intent.label,
    category: intent.category,
    kind: intent.kind,
    coverage: intent.coverage,
    canonical: intent.canonical,
    aliases: aliasesFor(intent.label),
  };
}

export function searchableCatalog(opts: { canonicalOnly?: boolean } = {}): SearchableIntent[] {
  const rows = opts.canonicalOnly === false ? loadIntentVocab().intents : canonicalVocab();
  return rows.map(asSearchable);
}

export function searchVocab(query: string, opts: IntentSearchOptions = {}): IntentSearchHit[] {
  return searchIntents(searchableCatalog({ canonicalOnly: true }), query, {
    uniqueLabels: true,
    limit: opts.limit ?? 12,
    minLength: opts.minLength ?? 1,
  });
}

function uniqueTokenIndex(): Map<string, VocabIntent> {
  if (uniqueTokenCache) return uniqueTokenCache;
  const counts = new Map<string, VocabIntent[]>();
  for (const intent of canonicalVocab()) {
    const tokens = asPhrase(intent.label)
      .split(" ")
      .filter((t) => t.length >= 3 && !STOP_TOKENS.has(t) && !STOP_LABELS.has(t.toUpperCase()));
    for (const token of tokens) {
      const list = counts.get(token) ?? [];
      list.push(intent);
      counts.set(token, list);
    }
  }
  uniqueTokenCache = new Map();
  for (const [token, intents] of counts) {
    if (intents.length === 1) uniqueTokenCache.set(token, intents[0]);
  }
  return uniqueTokenCache;
}

/**
 * Multi-label against the shared vocab. Not a product picker.
 * Longest / alias / distinctive-token hits win. Caps at 5. Single-intent is a degenerate compound.
 */
export function matchVocabLabels(text: string, limit = 5): VocabHit[] {
  const raw = text.trim();
  if (!raw) return [];
  const lower = raw.toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ");
  const hits = new Map<string, VocabHit>();

  const consider = (intent: VocabIntent, matched: string, confidence: number) => {
    const prev = hits.get(intent.id);
    if (!prev || confidence > prev.confidence) {
      hits.set(intent.id, {
        id: intent.id,
        label: intent.label,
        kind: intent.kind,
        category: intent.category,
        confidence,
        matched,
      });
    }
  };

  for (const intent of canonicalVocab()) {
    if (STOP_LABELS.has(intent.label)) continue;
    const aliases = aliasesFor(intent.label);
    for (const alias of aliases) {
      const needle = alias.toLowerCase();
      if (needle.length < 3) continue;
      if (lower.includes(needle)) {
        consider(intent, alias, alias.length >= 12 ? 0.95 : 0.9);
      }
    }
  }

  for (const intent of canonicalVocab()) {
    if (STOP_LABELS.has(intent.label)) continue;
    const phrase = asPhrase(intent.label);
    if (phrase.length < 3) continue;
    if (STOP_LABELS.has(phrase.toUpperCase())) continue;
    const tokens = phrase.split(" ");
    if (tokens.length === 1 && phrase.length < 4 && !SPEECH_ALIASES[intent.label]) continue;
    const re = new RegExp(`\\b${escapeReg(phrase)}\\b`, "i");
    if (re.test(raw) || re.test(lower)) {
      const confidence = Math.min(0.88, 0.55 + phrase.length / 40);
      consider(intent, phrase, confidence);
    }
  }

  for (const intent of canonicalVocab()) {
    if (STOP_LABELS.has(intent.label)) continue;
    for (const form of speechForms(intent.label)) {
      if (form.length < 10) continue;
      if (lower.includes(form)) consider(intent, form, 0.86);
    }
  }

  const unique = uniqueTokenIndex();
  for (const [token, intent] of unique) {
    if (STOP_LABELS.has(intent.label)) continue;
    const re = new RegExp(`\\b${escapeReg(token)}\\b`, "i");
    if (re.test(lower)) consider(intent, token, token.length >= 6 ? 0.8 : 0.72);
  }

  // Romance without the word "date" (canonical tennis-date sentence).
  if (!hits.has("i308-date") && /\b(might like|romantically|someone i like|go out with)\b/i.test(lower)) {
    const date = vocabByLabel("DATE");
    if (date) consider(date, "might like", 0.92);
  }

  return [...hits.values()]
    .sort((a, b) => b.confidence - a.confidence || b.label.length - a.label.length)
    .slice(0, limit);
}

export function resetVocabForTests(): void {
  cached = undefined;
  byLabelCache = undefined;
  uniqueTokenCache = undefined;
}
