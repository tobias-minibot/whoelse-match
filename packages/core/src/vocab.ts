import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

/** Speech patterns that are not the catalog label itself. */
export const SPEECH_ALIASES: Record<string, string[]> = {
  DATE: [
    "romantically",
    "romantic",
    "romance",
    "someone i might like",
    "someone i like",
    "might like",
    "go out with",
    "go on a date",
    "dating",
    "a date",
    "date me",
    "who to date",
    "should i date",
  ],
  TENNIS: ["play tennis", "tennis partner", "hit tennis", "tennis tonight", "a tennis"],
  APARTMENT: ["1-bedroom", "one-bedroom", "one bedroom", "a flat", "a place to rent", "rent an apartment"],
  SCHOOL: ["good school", "nearby school", "near a school", "elementary school", "the school"],
  FLIGHT: ["fly to", "a flight", "plane ticket", "flights to"],
  HOTEL: ["a hotel", "place to stay", "a room tonight", "hotel room"],
  JOB: ["a job", "looking for work", "looking for a role", "is hiring", "job opening"],
  "REMOTE WORK": ["work remotely", "remote work", "remote job", "work from home", "wfh"],
  RESTAURANT: ["a restaurant", "a table", "dinner reservation"],
  DOCTOR: ["a doctor", "see a doctor", "physician"],
  PLUMBER: ["a plumber", "fix a leak", "leak under my sink"],
  RIDE: ["a ride", "ride-share", "rideshare", "give me a ride"],
};

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

let cached: IntentVocab | undefined;
let byLabelCache: Map<string, VocabIntent> | undefined;

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
  return label.toLowerCase().replace(/\s+/g, " ");
}

/**
 * Multi-label against the shared vocab. Not a product picker.
 * Longest / alias hits win. Caps at 5. Single-intent is a degenerate compound.
 */
export function matchVocabLabels(text: string, limit = 5): VocabHit[] {
  const raw = text.trim();
  if (!raw) return [];
  const lower = raw.toLowerCase();
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

  for (const [label, aliases] of Object.entries(SPEECH_ALIASES)) {
    const intent = vocabByLabel(label);
    if (!intent) continue;
    for (const alias of aliases) {
      if (lower.includes(alias)) consider(intent, alias, alias.length >= 12 ? 0.95 : 0.9);
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
    if (re.test(raw)) {
      const confidence = Math.min(0.88, 0.55 + phrase.length / 40);
      consider(intent, phrase, confidence);
    }
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
}
