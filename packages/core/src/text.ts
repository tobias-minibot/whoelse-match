const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "if",
  "then",
  "than",
  "that",
  "this",
  "these",
  "those",
  "to",
  "of",
  "in",
  "on",
  "for",
  "with",
  "at",
  "from",
  "by",
  "as",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "it",
  "its",
  "i",
  "me",
  "my",
  "we",
  "our",
  "you",
  "your",
  "they",
  "their",
  "who",
  "else",
  "someone",
  "something",
  "into",
  "about",
  "over",
  "just",
  "also",
  "very",
  "more",
  "like",
  "likes",
  "want",
  "wants",
  "looking",
  "find",
  "near",
  "me",
  "should",
  "can",
  "could",
  "would",
  "rather",
  "has",
  "have",
  "give",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .split(/[^a-z0-9+]+/g)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

export function ngrams(tokens: string[], n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    out.push(tokens.slice(i, i + n).join(" "));
  }
  return out;
}

export function analyze(text: string): string[] {
  const unigrams = tokenize(text);
  return [...unigrams, ...ngrams(unigrams, 2)];
}

export function flattenUnknown(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) return value.map(flattenUnknown).join(" ");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([k]) => k !== "synthetic" && k !== "demo" && k !== "isAI")
      .map(([k, v]) => `${k} ${flattenUnknown(v)}`)
      .join(" ");
  }
  return "";
}

export function uniqueStrings(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((v) => String(v).trim()).filter(Boolean))];
}

export function jaccard(a: string[], b: string[]): number {
  const A = new Set(a.map((x) => x.toLowerCase()));
  const B = new Set(b.map((x) => x.toLowerCase()));
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter += 1;
  return inter / new Set([...A, ...B]).size;
}

export function sharedLabels(a: string[], b: string[]): string[] {
  const B = new Set(b.map((x) => x.toLowerCase()));
  return a.filter((x) => B.has(x.toLowerCase()));
}

export function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const v of a.values()) na += v * v;
  for (const v of b.values()) nb += v * v;
  if (na === 0 || nb === 0) return 0;
  const smaller = a.size < b.size ? a : b;
  const larger = smaller === a ? b : a;
  for (const [k, v] of smaller) {
    const w = larger.get(k);
    if (w) dot += v * w;
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
