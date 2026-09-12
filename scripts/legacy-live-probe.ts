#!/usr/bin/env npx tsx
/**
 * Hit LIVE production WhoElse (HTTP /api/whoelse, optional MCP) with
 * representative legacy intents. Writes legacy/live-probe-results.json.
 *
 *   npx tsx scripts/legacy-live-probe.ts
 *   WHOELSE_ORIGIN=https://whoelse-dating.vercel.app npx tsx scripts/legacy-live-probe.ts
 *
 * Does not change production. Laboratory only.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = process.env.WHOELSE_ORIGIN ?? "https://whoelse-dating.vercel.app";
const HTTP = `${ORIGIN}/api/whoelse`;
const MCP = `${ORIGIN}/api/mcp`;

type MappingIntent = {
  id: string;
  name: string;
  category: string;
  evidence: string;
  human_phrase: string;
  whoelse_find: { intent: string; type?: string; mode?: string; limit?: number };
  expressibility: { verdict: string };
};

type Match = {
  entity?: { id: string; type: string; name: string; description?: string; offers?: string[] };
  id?: string;
  type?: string;
  name?: string;
  description?: string;
  score?: number;
  explanation?: { why?: string };
};

type Probe = {
  id: string;
  category: string;
  evidence: string;
  human_phrase: string;
  request: { context: string; constraints?: { type?: string }; mode?: string; limit: number };
  http_status: number;
  latency_ms: number;
  inferred_mode?: string;
  match_count: number;
  top: { id: string; type: string; name: string; score: number }[];
  seed_relevant: boolean;
  relevance_hits: string[];
  lab_verdict: "SEEDED_HIT" | "EXPRESSIBLE_UNSEEDED" | "EMPTY" | "HTTP_ERROR";
};

const mapping = JSON.parse(readFileSync(join(ROOT, "legacy-intent-mapping.json"), "utf8")) as {
  intents: MappingIntent[];
};

const MUST = new Set([
  "DATE",
  "DATING",
  "APARTMENT",
  "RIDESHARE",
  "JOB",
  "NOTARY",
  "PLUMBER",
  "DENTIST",
  "DELIVERY",
  "RESTAURANT",
  "LAWYER",
  "GIFT",
  "CYCLING",
  "REAL_ESTATE",
  "PDF_SUMMARIZER",
  "WEB_BROWSER",
  "TRANSLATOR",
  "VERIFIER",
  "FAILOVER",
  "DELEGATE",
  "WITNESS",
]);

function pickRepresentatives(all: MappingIntent[]): MappingIntent[] {
  const picked: MappingIntent[] = [];
  const seen = new Set<string>();
  const take = (row: MappingIntent) => {
    if (seen.has(row.id)) return;
    seen.add(row.id);
    picked.push(row);
  };
  for (const row of all) {
    if (MUST.has(row.id) || row.evidence === "named" || row.evidence === "public" || row.evidence === "missed") {
      take(row);
    }
  }
  const byCat = new Map<string, MappingIntent[]>();
  for (const row of all) {
    const list = byCat.get(row.category) ?? [];
    list.push(row);
    byCat.set(row.category, list);
  }
  for (const [, rows] of byCat) {
    for (const row of rows.slice(0, 3)) take(row);
  }
  return picked;
}

const STOP = new Set([
  "else",
  "help",
  "with",
  "week",
  "this",
  "that",
  "who",
  "near",
  "available",
  "someone",
  "other",
  "from",
  "have",
  "what",
  "when",
  "want",
  "wants",
  "like",
  "just",
  "your",
  "their",
  "they",
  "them",
  "into",
  "more",
  "than",
  "should",
  "would",
  "could",
  "about",
  "which",
  "today",
  "tonight",
  "kind",
  "work",
  "food",
]);

function tokensFor(row: MappingIntent): string[] {
  const raw = `${row.id.replace(/_/g, " ")} ${row.name}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP.has(w));
  const extra: Record<string, string[]> = {
    DATE: ["date", "dinner", "walk", "riley", "plan-a-date", "meet"],
    DATING: ["date", "dating", "meet", "riley"],
    APARTMENT: ["apartment", "housing", "one-bedroom", "adams"],
    RIDESHARE: ["ride", "rideshare", "trail"],
    JOB: ["job", "hiring", "founder", "work"],
    NOTARY: ["notary"],
    PLUMBER: ["plumber", "leak", "sink"],
    DENTIST: ["dentist", "dental"],
    CYCLING: ["cycl", "bike", "trail", "mountain"],
    PDF_SUMMARIZER: ["summar", "pdf"],
    WEB_BROWSER: ["browse", "web"],
    TRANSLATOR: ["translat", "german"],
    VERIFIER: ["verif", "check"],
    FAILOVER: ["failover", "understudy", "take over"],
    DELEGATE: ["delegat", "hand-off", "handoff"],
    REAL_ESTATE: ["real estate", "housing", "permit", "maya"],
    GIFT: ["gift", "coffee"],
    LAWYER: ["lawyer", "legal", "attorney"],
    DELIVERY: ["deliver"],
    RESTAURANT: ["dinner", "restaurant", "vegan"],
    WITNESS: ["verif", "witness", "disagree"],
  };
  return [...new Set([...(extra[row.id] ?? []), ...raw])];
}

function blob(m: Match): string {
  const e = m.entity;
  return [
    e?.id ?? m.id,
    e?.type ?? m.type,
    e?.name ?? m.name,
    e?.description ?? m.description,
    (e?.offers ?? []).join(" "),
    m.explanation?.why,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function relevance(row: MappingIntent, matches: Match[]): { hit: boolean; hits: string[] } {
  const toks = tokensFor(row);
  const hits: string[] = [];
  for (const m of matches) {
    const b = blob(m);
    if (toks.some((t) => b.includes(t))) {
      hits.push(String(m.entity?.name ?? m.name ?? m.entity?.id ?? m.id));
    }
  }
  return { hit: hits.length > 0, hits };
}

async function httpWhoelse(body: Record<string, unknown>): Promise<{ status: number; json: Record<string, unknown>; ms: number }> {
  const t0 = Date.now();
  const res = await fetch(HTTP, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as Record<string, unknown>;
  return { status: res.status, json, ms: Date.now() - t0 };
}

async function mcpFind(intent: string): Promise<unknown> {
  const res = await fetch(MCP, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "whoelse.find", arguments: { intent, limit: 5 } },
    }),
  });
  return { status: res.status, body: await res.json() };
}

async function main() {
  const reps = pickRepresentatives(mapping.intents);
  if (reps.length < 50) {
    throw new Error(`need ≥50 representatives, got ${reps.length}`);
  }

  const probes: Probe[] = [];
  for (const row of reps) {
    const request = {
      context: row.whoelse_find.intent,
      constraints: row.whoelse_find.type ? { type: row.whoelse_find.type } : undefined,
      mode: row.whoelse_find.mode ?? "expand",
      limit: 5,
    };
    try {
      const { status, json, ms } = await httpWhoelse(request);
      const candidates = (json.candidates as Match[] | undefined) ?? [];
      const { hit, hits } = relevance(row, candidates);
      let lab: Probe["lab_verdict"] = "EMPTY";
      if (status >= 400) lab = "HTTP_ERROR";
      else if (hit) lab = "SEEDED_HIT";
      else if (candidates.length > 0) lab = "EXPRESSIBLE_UNSEEDED";
      else lab = "EMPTY";
      probes.push({
        id: row.id,
        category: row.category,
        evidence: row.evidence,
        human_phrase: row.human_phrase,
        request,
        http_status: status,
        latency_ms: ms,
        inferred_mode: json.inferredMode as string | undefined,
        match_count: candidates.length,
        top: candidates.slice(0, 5).map((m) => ({
          id: String(m.entity?.id ?? m.id ?? ""),
          type: String(m.entity?.type ?? m.type ?? ""),
          name: String(m.entity?.name ?? m.name ?? ""),
          score: Number(m.score ?? m.entity ? (m as { score?: number }).score ?? 0 : 0),
        })),
        seed_relevant: hit,
        relevance_hits: hits,
        lab_verdict: lab,
      });
      process.stdout.write(`${row.id.padEnd(22)} ${lab.padEnd(24)} n=${candidates.length} ${ms}ms\n`);
    } catch (err) {
      probes.push({
        id: row.id,
        category: row.category,
        evidence: row.evidence,
        human_phrase: row.human_phrase,
        request,
        http_status: 0,
        latency_ms: 0,
        match_count: 0,
        top: [],
        seed_relevant: false,
        relevance_hits: [],
        lab_verdict: "HTTP_ERROR",
      });
      process.stdout.write(`${row.id.padEnd(22)} HTTP_ERROR ${String(err)}\n`);
    }
  }

  let mcpSample: unknown = null;
  try {
    mcpSample = await mcpFind("Who else should I date?");
  } catch (err) {
    mcpSample = { error: String(err) };
  }

  const counts = probes.reduce<Record<string, number>>((acc, p) => {
    acc[p.lab_verdict] = (acc[p.lab_verdict] ?? 0) + 1;
    return acc;
  }, {});
  const schemaPass = probes.filter((p) => p.lab_verdict !== "HTTP_ERROR").length;
  const seeded = counts.SEEDED_HIT ?? 0;
  const out = {
    provenance: "live production probe 2026-09-12",
    origin: ORIGIN,
    http: HTTP,
    mcp: MCP,
    mapping_intents_total: mapping.intents.length,
    probed: probes.length,
    schema_expressible_pass_rate: schemaPass / probes.length,
    seed_relevant_pass_rate: seeded / probes.length,
    verdict_counts: counts,
    note:
      "Schema pass = HTTP 2xx with a well-formed whoelse.find call (legacy noun is not an endpoint). " +
      "Seed pass = at least one returned entity whose text overlaps the intent. " +
      "Unseeded is expected for dentist/plumber/notary on a dating-first seed. That is evidence, not a schema failure.",
    mcp_sample: mcpSample,
    probes,
  };

  const dest = join(ROOT, "legacy/live-probe-results.json");
  writeFileSync(dest, JSON.stringify(out, null, 2) + "\n");
  console.log(`\nwrote ${dest}`);
  console.log(
    `probed=${probes.length} schema_pass=${schemaPass}/${probes.length} seeded=${seeded}/${probes.length}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
