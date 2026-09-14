/**
 * Politely sample production Sentinel compile. Not required for counts.
 *
 *   pnpm coverage:505:probe
 *
 * Rate-limited. Does not write to the live network.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { CoverageRow } from "./types.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const ORIGIN = process.env.WHOELSE_ORIGIN ?? "https://whoelse-dating.vercel.app";
const DELAY_MS = Number(process.env.COVERAGE_PROBE_DELAY_MS ?? 250);

type Probe = {
  id: string;
  label: string;
  class: string;
  text: string;
  httpStatus: number;
  latencyMs: number;
  compileClass?: string;
  reason?: string;
  capability?: string;
};

const SAMPLE_IDS = [
  "i001-doctor",
  "i004-pharmacy",
  "i021-ambulance",
  "i032-wheelchair",
  "i038-personal-trainer",
  "i060-restaurant",
  "i073-recipe",
  "i081-water",
  "i088-apartment",
  "i092-mortgage",
  "i101-plumber",
  "i136-parking",
  "i138-rideshare",
  "i144-flight",
  "i157-bank",
  "i161-mortgage",
  "i165-tax",
  "i177-job",
  "i182-resume",
  "i245-babysitter",
  "i308-date",
  "i353-airbnb",
  "i385-lawyer",
  "i400-ai-tools",
  "i405-failover",
  "i420-concert",
  "i448-lost-and-found",
  "i451-open-now-shop",
  "i462-doctor-alias",
];

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function compile(text: string): Promise<{ status: number; ms: number; body: Record<string, unknown> }> {
  const started = Date.now();
  const res = await fetch(`${ORIGIN}/api/compile`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, find: false }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, ms: Date.now() - started, body };
}

async function main() {
  const rows = JSON.parse(readFileSync(join(ROOT, "evals/intent-coverage/intents.json"), "utf8")) as CoverageRow[];
  const byId = new Map(rows.map((r) => [r.id, r]));
  const probes: Probe[] = [];

  for (const id of SAMPLE_IDS) {
    const row = byId.get(id);
    if (!row) continue;
    const texts = [row.canonicalQuery, row.paraphrases[0]];
    for (const text of texts) {
      const hit = await compile(text);
      const inner = (hit.body.body ?? hit.body) as Record<string, unknown>;
      probes.push({
        id,
        label: row.label,
        class: row.class,
        text,
        httpStatus: hit.status,
        latencyMs: hit.ms,
        compileClass: String(inner.classification ?? inner.compile ?? ""),
        reason: typeof inner.reason === "string" ? inner.reason : undefined,
        capability:
          typeof (inner.seekDraft as { capability?: string } | undefined)?.capability === "string"
            ? (inner.seekDraft as { capability: string }).capability
            : undefined,
      });
      await sleep(DELAY_MS);
    }
  }

  const out = {
    origin: ORIGIN,
    probed: probes.length,
    ok: probes.filter((p) => p.httpStatus >= 200 && p.httpStatus < 300).length,
    probes,
  };
  writeFileSync(join(ROOT, "evals/intent-coverage/probe-results.json"), `${JSON.stringify(out, null, 2)}\n`);
  console.log(`probed ${out.probed} texts at ${ORIGIN} — ${out.ok} HTTP 2xx`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
