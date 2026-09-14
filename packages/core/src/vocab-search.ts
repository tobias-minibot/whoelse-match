/**
 * Pure intent search — no filesystem. Shared by Sentinel compile,
 * MCP whoelse.intents, and the human typeahead /universe filter.
 *
 * Vocab is a dispatch language, not a product picker.
 */

export type SearchableIntent = {
  id: string;
  label: string;
  category: string;
  kind?: string;
  coverage?: string | null;
  question?: string;
  aliases?: string[];
  canonical?: boolean;
};

export type IntentSearchHit = {
  id: string;
  label: string;
  category: string;
  kind?: string;
  coverage?: string | null;
  question: string;
  matched: string;
  score: number;
};

/**
 * Spoken forms that are not the Source Label itself.
 * Keys are canonical labels. Keep RIDE aliases on RIDESHARE — there is no RIDE row.
 */
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
  PRESCHOOL: [
    "kindergarten",
    "kindergarden",
    "pre-k",
    "prek",
    "pre k",
    "nursery school",
    "nursery",
    "a preschool",
  ],
  DAYCARE: ["day care", "childcare center", "child care"],
  "AFTER SCHOOL": ["after-school", "after school program", "afterschool"],
  FLIGHT: ["fly to", "a flight", "plane ticket", "flights to"],
  HOTEL: ["a hotel", "place to stay", "a room tonight", "hotel room"],
  JOB: ["a job", "looking for work", "looking for a role", "is hiring", "job opening"],
  "REMOTE WORK": ["work remotely", "remote work", "remote job", "work from home", "wfh"],
  RESTAURANT: ["a restaurant", "a table", "dinner reservation"],
  DOCTOR: ["a doctor", "see a doctor", "physician", "gp", "a gp"],
  PLUMBER: ["a plumber", "fix a leak", "leak under my sink"],
  RIDESHARE: ["a ride", "ride-share", "rideshare", "give me a ride", "ride share", "uber", "lyft"],
  TAXI: ["a taxi", "a cab", "cab"],
  IMMIGRATION: [
    "visa",
    "a visa",
    "visas",
    "green card",
    "work permit",
    "immigration lawyer",
    "visa appointment",
    "student visa",
    "tourist visa",
  ],
  "PDF SUMMARIZER": [
    "summarize this pdf",
    "summarize pdf",
    "summarise this pdf",
    "pdf summary",
    "pdf summarizer",
    "this pdf",
    "a pdf",
  ],
  "AI TOOLS": ["ai tool", "ai tools", "an ai tool"],
  LAWYER: ["an attorney", "attorney", "legal counsel", "a lawyer"],
  BABYSITTER: ["babysit", "baby sitter", "childminder", "watch the kids"],
  "PERSONAL TRAINER": ["pt session", "a trainer", "personal training"],
  "VEGAN FOOD": ["vegan", "plant-based", "plant based"],
  METRO: ["the metro", "subway", "the tube", "underground train"],
  PHOTOGRAPHER: ["photoshoot", "photo shoot", "a photographer"],
  WEDDING: ["get married", "a wedding"],
  INVESTMENT: ["invest", "writes checks", "a check", "angel invest"],
  INSURANCE: ["an insurance", "insured", "a policy"],
};

const QUERY_STOP = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "to",
  "of",
  "in",
  "on",
  "for",
  "with",
  "at",
  "from",
  "who",
  "else",
  "me",
  "my",
  "i",
  "is",
  "has",
  "can",
  "near",
]);

export function prettyLabel(label: string): string {
  return label.toLowerCase().replace(/\s+/g, " ").trim();
}

export function articleFor(label: string): "a" | "an" {
  return /^[aeiou]/i.test(prettyLabel(label)) ? "an" : "a";
}

export function intentQuestion(intent: Pick<SearchableIntent, "label" | "question">): string {
  if (intent.question?.trim()) return intent.question.trim();
  const p = prettyLabel(intent.label);
  return `Who else is ${articleFor(intent.label)} ${p}?`;
}

export function aliasesFor(label: string, extra: string[] = []): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const alias of [...(SPEECH_ALIASES[label] ?? []), ...extra]) {
    const key = alias.toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(alias);
  }
  return out;
}

/** Generated who-else paraphrases used by compile matching, not a second ontology. */
export function speechForms(label: string): string[] {
  const pretty = prettyLabel(label);
  const a = articleFor(label);
  return [
    `${pretty} who else`,
    `${label.toLowerCase()} who else`,
    `looking for ${a} ${pretty}`,
    `find me ${a} ${pretty}`,
    `who else has ${a} ${pretty}`,
    `who else is ${a} ${pretty}`,
    `who else wants ${a} ${pretty}`,
    `who else can help with ${pretty}`,
  ];
}

function haystackOf(intent: SearchableIntent): string {
  const pretty = prettyLabel(intent.label);
  const aliases = aliasesFor(intent.label, intent.aliases);
  return [
    intent.label,
    pretty,
    intent.category ?? "",
    intent.coverage ?? "",
    intentQuestion(intent),
    ...aliases,
    ...speechForms(intent.label),
  ]
    .join("\n")
    .toLowerCase();
}

function queryTokens(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9+]+/g)
    .filter((t) => t.length >= 2 && !QUERY_STOP.has(t));
}

export interface IntentSearchOptions {
  limit?: number;
  minLength?: number;
  /** Prefer canonical rows when duplicate labels exist. */
  uniqueLabels?: boolean;
}

function scoreIntent(intent: SearchableIntent, query: string): { score: number; matched: string } | null {
  const q = query.trim().toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ");
  if (!q) return null;
  const coverage = (intent.coverage ?? "").toLowerCase();
  if (/^[a-e]$/.test(q)) {
    return coverage === q ? { score: 100, matched: `class ${coverage.toUpperCase()}` } : null;
  }
  const label = intent.label.toLowerCase();
  const pretty = prettyLabel(intent.label);
  const question = intentQuestion(intent).toLowerCase();
  const category = (intent.category ?? "").toLowerCase();
  const aliases = aliasesFor(intent.label, intent.aliases).map((a) => a.toLowerCase());

  let score = 0;
  let matched = pretty;

  if (label === q || pretty === q) {
    score = 100;
    matched = intent.label;
  } else if (label.startsWith(q) || pretty.startsWith(q)) {
    score = 92;
    matched = intent.label;
  } else if (pretty.includes(q) || label.includes(q)) {
    score = 84;
    matched = pretty;
  }

  for (const alias of aliases) {
    if (alias === q && score < 90) {
      score = 90;
      matched = alias;
    } else if (alias.startsWith(q) && score < 82) {
      score = 82;
      matched = alias;
    } else if (q.length >= 3 && alias.includes(q) && score < 78) {
      score = 78;
      matched = alias;
    }
  }

  if (q.length >= 3 && question.includes(q) && score < 70) {
    score = 70;
    matched = intentQuestion(intent);
  }
  if (q.length >= 3 && category.includes(q) && score < 58) {
    score = 58;
    matched = intent.category;
  }

  if (score === 0) {
    const tokens = queryTokens(q);
    if (tokens.length === 0) return null;
    const hay = haystackOf(intent);
    const hits = tokens.filter((t) => hay.includes(t));
    if (hits.length === tokens.length) {
      score = tokens.length > 1 ? 64 : q.length >= 3 ? 52 : 0;
      matched = hits[0] ?? pretty;
    } else if (hits.length > 0 && hits.length >= Math.ceil(tokens.length * 0.6)) {
      score = 48;
      matched = hits[0] ?? pretty;
    }
  }

  return score > 0 ? { score, matched } : null;
}

export function searchIntents(
  catalog: SearchableIntent[],
  query: string,
  opts: IntentSearchOptions = {},
): IntentSearchHit[] {
  const q = query.trim();
  const minLength = opts.minLength ?? 1;
  if (q.length < minLength) return [];
  const limit = opts.limit ?? 12;
  const hits: IntentSearchHit[] = [];
  const seen = new Set<string>();

  for (const intent of catalog) {
    if (opts.uniqueLabels) {
      const key = intent.label;
      if (seen.has(key)) continue;
      seen.add(key);
    }
    const scored = scoreIntent(intent, q);
    if (!scored) continue;
    hits.push({
      id: intent.id,
      label: intent.label,
      category: intent.category,
      kind: intent.kind,
      coverage: intent.coverage ?? null,
      question: intentQuestion(intent),
      matched: scored.matched,
      score: scored.score,
    });
  }

  hits.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label) || a.id.localeCompare(b.id));
  return hits.slice(0, Math.max(1, limit));
}

/**
 * Insert or refine a Who else? sentence from a picked vocab hit.
 * Short search fragments become the canonical question; existing
 * who-else sentences append the label instead of wiping the box.
 */
export function refineWhoElseQuery(current: string, intent: SearchableIntent): string {
  const question = intentQuestion(intent);
  const pretty = prettyLabel(intent.label);
  const trimmed = current.trim();
  if (!trimmed) return question;

  const lower = trimmed.toLowerCase();
  const aliasHit = aliasesFor(intent.label, intent.aliases).some(
    (a) => a.toLowerCase().includes(lower) || lower.includes(a.toLowerCase()),
  );
  const looksLikeSearch =
    trimmed.length <= 48 &&
    !/[.!]/.test(trimmed) &&
    (pretty.includes(lower) ||
      intent.label.toLowerCase().includes(lower) ||
      aliasHit ||
      (intent.category ?? "").toLowerCase().includes(lower) ||
      lower.split(/\s+/).length <= 3);

  if (looksLikeSearch && !/\bwho else\b/i.test(trimmed)) return question;
  if (lower.includes(pretty) || lower.includes(intent.label.toLowerCase())) {
    return /[?]$/.test(trimmed) ? trimmed : question;
  }
  if (/\bwho else\b/i.test(trimmed) || /^find me\b/i.test(trimmed)) {
    return `${trimmed.replace(/[?!.]+$/, "")} and ${pretty}?`;
  }
  return question;
}
