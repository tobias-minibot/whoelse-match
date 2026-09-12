"use client";

import { useMemo, useState } from "react";
import type { Candidate, Entity, WhoElsePayload } from "@/lib/types";

const EXAMPLES = [
  "Who else wants to build a network of voice assistants?",
  "Who else near me is into mountain biking?",
  "Who else works on real estate projects in DC right now?",
  "Who else wants a low-key dinner and a walk, not an app marathon?",
  "Who else is a founder looking for a thought partner?",
];

type TrailItem = { label: string; context: string; entityId?: string; exclude: string[] };

export function DiscoverApp() {
  const [query, setQuery] = useState(EXAMPLES[0]);
  const [activeChip, setActiveChip] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WhoElsePayload | null>(null);
  const [trail, setTrail] = useState<TrailItem[]>([]);
  const [seen, setSeen] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [chatEntity, setChatEntity] = useState<Entity | null>(null);
  const [chatLog, setChatLog] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const humans = useMemo(
    () => (result?.humans ?? []).filter((c) => !hidden.has(c.entity.id)),
    [result, hidden],
  );
  const ais = useMemo(
    () => (result?.ais ?? []).filter((c) => !hidden.has(c.entity.id)),
    [result, hidden],
  );

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  }

  async function runFind(context: string, extras: { entityId?: string; exclude?: string[]; mode?: string } = {}) {
    setLoading(true);
    try {
      const path = extras.entityId ? "/api/whoelse/more-like" : "/api/whoelse";
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context,
          entityId: extras.entityId,
          exclude: extras.exclude ?? seen,
          mode: extras.mode,
          limit: 8,
        }),
      });
      const data = (await res.json()) as WhoElsePayload;
      setResult(data);
      const ids = data.candidates.map((c) => c.entity.id);
      setSeen((prev) => [...new Set([...prev, ...ids, extras.entityId ?? ""])].filter(Boolean));
      setHidden(new Set());
    } catch {
      flash("Discovery failed — is the server running?");
    } finally {
      setLoading(false);
    }
  }

  function askWhoElse() {
    const next: TrailItem = { label: query, context: query, exclude: seen };
    setTrail((t) => [...t, next]);
    void runFind(query);
  }

  function recursiveWhoElse(candidate: Candidate) {
    const context = `Who else like ${candidate.entity.name}?`;
    setQuery(context);
    setActiveChip(-1);
    setTrail((t) => [
      ...t,
      { label: `like ${candidate.entity.name}`, context, entityId: candidate.entity.id, exclude: seen },
    ]);
    void runFind(context, { entityId: candidate.entity.id, exclude: [...seen, candidate.entity.id] });
  }

  function moreLikeThis(candidate: Candidate) {
    const context = `${query} — more like ${candidate.entity.name}`;
    setQuery(context);
    setTrail((t) => [
      ...t,
      { label: `more like ${candidate.entity.name}`, context, entityId: candidate.entity.id, exclude: seen },
    ]);
    void runFind(context, {
      entityId: candidate.entity.id,
      exclude: [...seen, candidate.entity.id],
      mode: "peers",
    });
  }

  async function lessLikeThis(candidate: Candidate) {
    await fetch("/api/whoelse/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityId: candidate.entity.id, signal: "less", query }),
    });
    setHidden((prev) => new Set([...prev, candidate.entity.id]));
    flash(`Less like ${candidate.entity.name} — noted.`);
  }

  async function chatOrInterest(candidate: Candidate) {
    if (candidate.entity.type === "ai") {
      setChatEntity(candidate.entity);
      setChatLog([
        {
          role: "assistant",
          content: `${candidate.entity.name} is an AI, not a human. ${candidate.entity.description}`,
        },
      ]);
      setChatInput("");
      return;
    }
    const res = await fetch("/api/interest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityId: candidate.entity.id }),
    });
    const data = await res.json();
    flash(data.message ?? "Interest recorded (stub).");
  }

  async function sendChat() {
    if (!chatEntity || !chatInput.trim()) return;
    const messages = [...chatLog, { role: "user" as const, content: chatInput.trim() }];
    setChatLog(messages);
    setChatInput("");
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityId: chatEntity.id, messages }),
    });
    const data = await res.json();
    setChatLog((prev) => [...prev, { role: "assistant", content: data.reply ?? data.error }]);
  }

  return (
    <div className="app">
      <nav className="nav">
        <div className="logo">
          who <em>else?</em>
        </div>
        <div className="nav-links">
          <a className="ghost" href="/landing/index.html">
            Landing
          </a>
          <a className="ghost" href="/landing/index.html#story">
            Story
          </a>
        </div>
      </nav>

      <div className="banner">
        Demo pool only. Every human is <strong>synthetic</strong>. Every AI is labeled AI — never a stand-in person.
        No real dating sites were used.
      </div>

      <section className="search-panel">
        <div className="eyebrow">Dating vertical · humans & AIs</div>
        <h1>Who are you looking for?</h1>
        <div className="search-row">
          <textarea
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveChip(-1);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                askWhoElse();
              }
            }}
            aria-label="Who are you looking for?"
          />
          <button className="btn btn-coral" type="button" onClick={askWhoElse} disabled={loading}>
            {loading ? "Looking…" : "Who else?"}
          </button>
        </div>
        <div className="chips">
          {EXAMPLES.map((example, i) => (
            <button
              key={example}
              type="button"
              className={activeChip === i ? "active" : ""}
              onClick={() => {
                setQuery(example);
                setActiveChip(i);
              }}
            >
              {example.length > 52 ? `${example.slice(0, 50)}…` : example}
            </button>
          ))}
        </div>
        {result && (
          <div className="meta-row">
            mode <strong>{result.inferredMode}</strong>
            {result.inferredConstraints.city
              ? ` · city ${String(result.inferredConstraints.city)}`
              : ""}
            {result.usedOpenAiRerank ? " · OpenAI rerank on" : " · local TF-IDF + structured match"}
          </div>
        )}
      </section>

      {trail.length > 0 && (
        <div className="trail">
          {trail.map((step, i) => (
            <button
              key={`${step.label}-${i}`}
              type="button"
              onClick={() => {
                setQuery(step.context);
                void runFind(step.context, { entityId: step.entityId, exclude: step.exclude });
              }}
            >
              {step.label}
            </button>
          ))}
        </div>
      )}

      {!result && <p className="empty">Ask who else — not swipe. Results split humans then AIs so the type is never ambiguous.</p>}

      {result && (
        <>
          <h2 className="section-title">Humans</h2>
          <div className="cards">
            {humans.length === 0 && <p className="empty">No human matches in this slice.</p>}
            {humans.map((c) => (
              <ResultCard
                key={c.entity.id}
                candidate={c}
                onWhoElse={() => recursiveWhoElse(c)}
                onMore={() => moreLikeThis(c)}
                onLess={() => void lessLikeThis(c)}
                onChat={() => void chatOrInterest(c)}
              />
            ))}
          </div>

          <h2 className="section-title">AIs</h2>
          <div className="cards">
            {ais.length === 0 && <p className="empty">No AI matches in this slice.</p>}
            {ais.map((c) => (
              <ResultCard
                key={c.entity.id}
                candidate={c}
                onWhoElse={() => recursiveWhoElse(c)}
                onMore={() => moreLikeThis(c)}
                onLess={() => void lessLikeThis(c)}
                onChat={() => void chatOrInterest(c)}
              />
            ))}
          </div>
        </>
      )}

      {toast && <div className="toast">{toast}</div>}

      {chatEntity && (
        <div className="modal-back" onClick={() => setChatEntity(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Chat with {chatEntity.name}</h2>
            <p className="empty">This is an AI. It is not a human. Demo stub unless OPENAI_API_KEY is set.</p>
            <div className="chat-log">
              {chatLog.map((m, i) => (
                <div key={i} className={`bubble ${m.role}`}>
                  {m.content}
                </div>
              ))}
            </div>
            <div className="search-row">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={`Message ${chatEntity.name}…`}
              />
              <button className="btn btn-ink" type="button" onClick={() => void sendChat()}>
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultCard({
  candidate,
  onWhoElse,
  onMore,
  onLess,
  onChat,
}: {
  candidate: Candidate;
  onWhoElse: () => void;
  onMore: () => void;
  onLess: () => void;
  onChat: () => void;
}) {
  const e = candidate.entity;
  const initials = e.name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
  const loc = [e.location?.city, e.location?.region].filter(Boolean).join(", ");
  const demo =
    e.type === "human"
      ? String(e.metadata.demoLabel ?? "synthetic human")
      : String(e.metadata.aiDisclosure ?? "AI — not a human");

  return (
    <article className="card">
      <div className="card-top">
        <div className="identity">
          <div className={`av ${e.type}`}>{initials}</div>
          <div>
            <h3>{e.name}</h3>
            <p>
              {loc || (e.type === "ai" ? "not geo-bound" : "location unset")} · {demo}
            </p>
          </div>
        </div>
        <span className={`badge ${e.type}`}>{e.type === "ai" ? "AI" : "Human"}</span>
      </div>
      <p className="why">{candidate.explanation.why}</p>
      <div className="pills">
        {candidate.explanation.commonalities.slice(0, 5).map((c) => (
          <span key={c} className="pill">
            {c}
          </span>
        ))}
      </div>
      {candidate.explanation.surprisingDifference && (
        <p className="diff">{candidate.explanation.surprisingDifference}</p>
      )}
      <div className="actions">
        <button className="btn btn-coral btn-sm" type="button" onClick={onWhoElse}>
          Who else?
        </button>
        <button className="btn btn-soft btn-sm" type="button" onClick={onMore}>
          More like this
        </button>
        <button className="btn btn-soft btn-sm" type="button" onClick={onLess}>
          Less like this
        </button>
        <button className={`btn btn-sm ${e.type === "ai" ? "btn-ai" : "btn-ink"}`} type="button" onClick={onChat}>
          {e.type === "ai" ? "Chat" : "Chat (interest)"}
        </button>
      </div>
    </article>
  );
}
