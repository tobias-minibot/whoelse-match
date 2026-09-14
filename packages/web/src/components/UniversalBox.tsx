"use client";

import { useEffect, useState } from "react";
import { CompilePanel, type CompilePayload } from "@/components/CompilePanel";
import { IntentChips, IntentSuggest } from "@/components/IntentSuggest";
import { JoinHint } from "@/components/JoinHint";
import { SiteNav } from "@/components/SiteNav";
import { fetchMe, type MePayload } from "@/lib/me";
import { refineWhoElseQuery, useIntentSuggest } from "@/lib/use-intent-suggest";
import type { IntentSearchHit } from "@whoelse/core/vocab-search";
import type { Candidate, Entity, WhoElsePayload } from "@/lib/types";

const EXAMPLES = [
  "Who else can do calendar hold resolution?",
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
  const [asClerk, setAsClerk] = useState(false);
  const [me, setMe] = useState<MePayload | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [compiled, setCompiled] = useState<CompilePayload | null>(null);
  const [compiling, setCompiling] = useState(false);
  const [picked, setPicked] = useState<{ id: string; label: string }[]>([]);
  const suggest = useIntentSuggest(query);

  useEffect(() => {
    void fetchMe().then(setMe);
  }, []);

  async function ask(context = query) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/whoelse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context,
          limit: 8,
          requester: asClerk ? "agent-inbox-clerk" : undefined,
        }),
      });
      if (!res.ok) throw new Error(`whoelse ${res.status}`);
      setResult((await res.json()) as WhoElsePayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function compileQuery() {
    setCompiling(true);
    try {
      const res = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: query, find: false }),
      });
      setCompiled((await res.json()) as CompilePayload);
    } catch (err) {
      setCompiled({
        classification: "NOT_WHOELSE",
        reason: err instanceof Error ? err.message : "compile failed",
        confidence: 0,
        ir: { intent: query, constraints: {}, exclusions: [] },
        error: err instanceof Error ? err.message : "compile failed",
      });
    } finally {
      setCompiling(false);
    }
  }

  function pickIntent(hit: IntentSearchHit) {
    const next = refineWhoElseQuery(query, hit);
    const appending = /\bwho else\b/i.test(query.trim()) && next !== query.trim() && / and /i.test(next);
    setQuery(next);
    setPicked((prev) => {
      const row = { id: hit.id, label: hit.label };
      if (appending) return prev.some((p) => p.id === hit.id) ? prev : [...prev, row];
      return [row];
    });
    suggest.setOpen(false);
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

  async function propose(candidate: Candidate) {
    if (!me?.entity?.id) {
      setToast(me === null ? "Sign in to propose a match." : "Finish joining before you can propose.");
      window.setTimeout(() => setToast(null), 2800);
      return;
    }
    const res = await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requesterEntityId: me.entity.id,
        candidateEntityId: candidate.entity.id,
        seekPublicationId: candidate.matched?.seek?.id,
        offerPublicationId: candidate.matched?.offer?.id,
        query,
        score: candidate.score,
        explanation: { why: candidate.explanation.why },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setToast(data.error ?? `propose ${res.status}`);
      window.setTimeout(() => setToast(null), 2800);
      return;
    }
    window.location.href = "/matches";
  }

  const dating = result?.inferredView === "dating" || result?.inferredVertical === "dating";

  return (
    <div className="app">
      <SiteNav current="home" />
      <p className="doctrine">
        <strong>One box. No category required.</strong> Same <code>whoelse.find</code> as Dating / Agents /
        Experts. Compile is Sentinel v0 — it will not force every sentence into a match.{" "}
        <a href="/">Three lenses →</a>
      </p>
      <JoinHint />
      <div className="banner banner-demo">
        <strong>DEMO.</strong> Same <code>whoelse.find</code>. No category required. “Who else can do calendar
        hold resolution?” should return Holdwright (an agent OFFER) without a lens.
      </div>
      <section className="search-panel">
        <div className="eyebrow">Universal Who else?</div>
        <h1>What do you have — or need?</h1>
        <div className="search-row">
          <div className="intent-box">
            <textarea
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                suggest.setOpen(true);
                if (!e.target.value.trim()) setPicked([]);
              }}
              onFocus={() => suggest.setOpen(true)}
              onBlur={() => window.setTimeout(() => suggest.setOpen(false), 120)}
              onKeyDown={(e) => {
                const handled = suggest.onKeyDown(e, () => void ask());
                if (handled && typeof handled === "object") pickIntent(handled);
              }}
              aria-label="Universal who else"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={suggest.visible}
              aria-controls="intent-suggest-universal"
            />
            <div id="intent-suggest-universal">
              <IntentSuggest
                hits={suggest.hits}
                active={suggest.active}
                visible={suggest.visible}
                onHover={suggest.setActive}
                onPick={pickIntent}
              />
            </div>
          </div>
          <button className="btn btn-coral" type="button" onClick={() => void ask()} disabled={loading}>
            {loading ? "Looking…" : "Who else?"}
          </button>
          <button className="btn btn-ink" type="button" onClick={() => void compileQuery()} disabled={compiling}>
            {compiling ? "Compiling…" : "Compile"}
          </button>
        </div>
        <IntentChips items={picked} onRemove={(id) => setPicked((prev) => prev.filter((p) => p.id !== id))} />
        <p className="intent-browse">
          <a href="/universe">All intents</a>
        </p>
        <CompilePanel
          result={compiled}
          onUseIntent={(intent) => {
            setQuery(intent);
            void ask(intent);
          }}
        />
        <div className="chips">
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" className={query === ex ? "active" : ""} onClick={() => setQuery(ex)}>
              {ex.length > 56 ? `${ex.slice(0, 54)}…` : ex}
            </button>
          ))}
          <button
            type="button"
            className={asClerk ? "active" : ""}
            onClick={() => setAsClerk((v) => !v)}
            aria-pressed={asClerk}
          >
            {asClerk ? "Requester: InboxClerk" : "No requester"}
          </button>
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

      {result && result.pairs && result.pairs.length > 0 && (
        <>
          <h2 className="section-title">OFFER ↔ SEEK pairs</h2>
          <ul className="empty">
            {result.pairs.map((p) => (
              <li key={`${p.offer.id}-${p.seek.id}`}>
                {p.seek.entityId === "query" ? "this query" : p.seek.entityId} SEEK{" "}
                <strong>{p.seek.capability}</strong> ↔ {p.offer.entityId} OFFER{" "}
                <strong>{p.offer.capability}</strong>
              </li>
            ))}
          </ul>
        </>
      )}
      {result && dating && (
        <>
          <h2 className="section-title">Humans</h2>
          <CardList items={result.humans} onReverse={reverse} onPropose={propose} />
          <h2 className="section-title">AIs</h2>
          <CardList items={result.ais} onReverse={reverse} onPropose={propose} />
        </>
      )}
      {result && !dating && (
        <>
          <h2 className="section-title">Who else — mixed types</h2>
          <p className="empty">Type stays on the badge. No category was selected.</p>
          <CardList items={result.candidates} onReverse={reverse} onPropose={propose} />
        </>
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function CardList({
  items,
  onReverse,
  onPropose,
}: {
  items: Candidate[];
  onReverse: (id: string) => void;
  onPropose: (c: Candidate) => void;
}) {
  if (!items.length) return <p className="empty">No matches in this slice.</p>;
  return (
    <div className="cards">
      {items.map((c) => (
        <OneCard
          key={c.entity.id}
          candidate={c}
          onReverse={() => onReverse(c.entity.id)}
          onPropose={() => onPropose(c)}
        />
      ))}
    </div>
  );
}

function OneCard({
  candidate,
  onReverse,
  onPropose,
}: {
  candidate: Candidate;
  onReverse: () => void;
  onPropose: () => void;
}) {
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
      {pubLine(candidate) && <p className="facts">Network object · {pubLine(candidate)}</p>}
      {trust && <p className="facts evidence">Why trust this? {trust}</p>}
      <div className="actions">
        <button className="btn btn-ink btn-sm" type="button" onClick={onPropose}>
          Propose match
        </button>
        <button className="btn btn-coral btn-sm" type="button" onClick={onReverse}>
          Who else needs / has this?
        </button>
      </div>
    </article>
  );
}

function pubLine(c: Candidate): string {
  const matched = c.matched?.offer?.capability
    ? `OFFER ${c.matched.offer.capability}`
    : c.matched?.seek?.capability
      ? `SEEK ${c.matched.seek.capability}`
      : "";
  if (matched) return matched;
  const pubs = c.entity.publications ?? [];
  const offer = pubs.find((p) => p.kind === "offer");
  const seek = pubs.find((p) => p.kind === "seek");
  if (offer) return `OFFER ${offer.capability}`;
  if (seek) return `SEEK ${seek.capability}`;
  if (c.entity.offers?.[0]) return `OFFER ${c.entity.offers[0]}`;
  if (c.entity.seeks?.[0]) return `SEEK ${c.entity.seeks[0]}`;
  return "";
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
