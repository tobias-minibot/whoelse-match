"use client";

import { useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import type { Candidate, Entity, WhoElsePayload } from "@/lib/types";

const EXAMPLES = [
  "I need someone who can redesign my website next week for under $2,000.",
  "I need help understanding this market.",
  "Who else wants to build a network of voice assistants?",
  "Who else has a 1-bedroom in DC under $2,500?",
  "Who else can give me a ride from Georgetown to Dupont?",
  "Who else can verify this result?",
];

export function UniversalBox() {
  const [query, setQuery] = useState(EXAMPLES[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WhoElsePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/whoelse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: query, limit: 8 }),
      });
      if (!res.ok) throw new Error(`whoelse ${res.status}`);
      setResult((await res.json()) as WhoElsePayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function reverse(entityId: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/reciprocal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId, limit: 5 }),
      });
      if (!res.ok) throw new Error(`reciprocal ${res.status}`);
      setResult((await res.json()) as WhoElsePayload);
    } finally {
      setLoading(false);
    }
  }

  const dating = result?.inferredView === "dating" || result?.inferredVertical === "dating";

  return (
    <div className="app">
      <SiteNav current="box" />
      <p className="doctrine">
        <strong>One box. No category required.</strong> Verticals are inferred views, not tabs.{" "}
        <a href="/">Costume tabs for comparison →</a>
      </p>
      <div className="banner banner-demo">
        <strong>DEMO.</strong> Same <code>whoelse.find</code>. No category required. “I need help understanding this market.” should return mixed types.
      </div>
      <section className="search-panel">
        <div className="eyebrow">Universal Who else?</div>
        <h1>What do you have — or need?</h1>
        <div className="search-row">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void ask();
              }
            }}
            aria-label="Universal who else"
          />
          <button className="btn btn-coral" type="button" onClick={() => void ask()} disabled={loading}>
            {loading ? "Looking…" : "Who else?"}
          </button>
        </div>
        <div className="chips">
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" className={query === ex ? "active" : ""} onClick={() => setQuery(ex)}>
              {ex.length > 56 ? `${ex.slice(0, 54)}…` : ex}
            </button>
          ))}
        </div>
        {error && <p className="empty">{error}</p>}
        {result?.universal && (
          <div className="infer-panel" aria-live="polite">
            <div className="eyebrow">Inferred (not a second matcher)</div>
            <p>
              side <strong>{result.universal.side ?? "open"}</strong>
              {result.universal.view ? ` · view ${result.universal.view}` : ""}
              {result.universal.relation ? ` · relation ${result.universal.relation}` : ""}
              {result.universal.roles?.length ? ` · roles ${result.universal.roles.join("/")}` : ""}
              {result.universal.entityType ? ` · type ${result.universal.entityType}` : " · type open"}
              {result.universal.soft.city ? ` · city ${result.universal.soft.city}` : ""}
              {result.universal.evidenceNeeds.length
                ? ` · evidence ${result.universal.evidenceNeeds.join(", ")}`
                : ""}
              {result.universal.soft.labels?.length ? ` · soft ${result.universal.soft.labels.join(", ")}` : ""}
            </p>
            {result.universal.hard.length > 0 && (
              <p className="facts">
                hard {result.universal.hard.map((a) => `${a.key} ${a.op} ${String(a.value ?? "")}`).join(" · ")}
              </p>
            )}
          </div>
        )}
      </section>

      {result && dating && (
        <>
          <h2 className="section-title">Humans</h2>
          <CardList items={result.humans} onReverse={reverse} />
          <h2 className="section-title">AIs</h2>
          <CardList items={result.ais} onReverse={reverse} />
        </>
      )}
      {result && !dating && (
        <>
          <h2 className="section-title">Who else — mixed types</h2>
          <p className="empty">Type stays on the badge. No category was selected.</p>
          <CardList items={result.candidates} onReverse={reverse} />
        </>
      )}
    </div>
  );
}

function CardList({ items, onReverse }: { items: Candidate[]; onReverse: (id: string) => void }) {
  if (!items.length) return <p className="empty">No matches in this slice.</p>;
  return (
    <div className="cards">
      {items.map((c) => (
        <OneCard key={c.entity.id} candidate={c} onReverse={() => onReverse(c.entity.id)} />
      ))}
    </div>
  );
}

function OneCard({ candidate, onReverse }: { candidate: Candidate; onReverse: () => void }) {
  const e = candidate.entity;
  const initials = e.name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
  const loc = [e.attributes.neighborhood, e.location?.city, e.location?.region].filter(Boolean).join(", ");
  const trust = trustLine(e);
  return (
    <article className="card">
      <div className="card-top">
        <div className="identity">
          <div className={`av ${e.type}`}>{initials || "?"}</div>
          <div>
            <h3>{e.name}</h3>
            <p>
              {loc || "not geo-bound"} · {String(e.metadata.demoLabel ?? e.type)}
            </p>
          </div>
        </div>
        <span className={`badge ${e.type}`}>{e.type}</span>
      </div>
      <p className="why">{candidate.explanation.why}</p>
      {trust && <p className="facts evidence">Why trust this? {trust}</p>}
      <div className="actions">
        <button className="btn btn-ink btn-sm" type="button" onClick={onReverse}>
          Who else needs / has this?
        </button>
      </div>
    </article>
  );
}

function trustLine(e: Entity): string {
  const ev = e.trust?.evidence;
  if (!ev) return e.trust?.notes ? String(e.trust.notes) : "";
  const bits: string[] = [];
  if (ev.verified) bits.push(ev.verifiedBy ? `verified by ${ev.verifiedBy}` : "verified stub");
  if (ev.licenses?.length) bits.push(`license ${ev.licenses[0]}`);
  if (ev.outcomes?.length) bits.push(ev.outcomes[0].label);
  if (ev.portfolio?.length) bits.push("portfolio");
  return bits.join(" · ");
}
