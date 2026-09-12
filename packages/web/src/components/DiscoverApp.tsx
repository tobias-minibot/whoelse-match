"use client";

import { useMemo, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import type { Candidate, Entity, WhoElsePayload } from "@/lib/types";

const DATING_EXAMPLES = [
  "Who else wants to build a network of voice assistants?",
  "Who else near me is into mountain biking?",
  "Who else works on real estate projects in DC right now?",
  "Who else wants a low-key dinner and a walk, not an app marathon?",
  "Who else is a founder looking for a thought partner?",
];

const SEEK_EXAMPLES = [
  "Who else has a 1-bedroom apartment in DC under $2,500?",
  "Who else has a furnished sublet in Berlin for three months?",
  "Who else has a place near Georgetown?",
  "Who else accepts pets?",
  "Who else has something available next month?",
];

const OFFER_EXAMPLES = [
  "I have a furnished 1-bedroom in Georgetown for $2,200 that allows pets",
  "Who else needs a furnished apartment in Berlin?",
  "Who else is looking for exactly the apartment I have?",
  "Who else might be a good tenant for this listing?",
  "Who else is looking for a 2-bedroom in DC?",
];

type Vertical = "dating" | "apartment";
type ApartmentSide = "seek" | "offer";
type TrailItem = {
  label: string;
  context: string;
  entityId?: string;
  exclude: string[];
  mode?: string;
  constraints?: Record<string, unknown>;
};

export function DiscoverApp() {
  const [vertical, setVertical] = useState<Vertical>("dating");
  const [apartmentSide, setApartmentSide] = useState<ApartmentSide>("seek");
  const [query, setQuery] = useState(DATING_EXAMPLES[0]);
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

  const examples =
    vertical === "dating" ? DATING_EXAMPLES : apartmentSide === "offer" ? OFFER_EXAMPLES : SEEK_EXAMPLES;

  const visible = useMemo(
    () => (result?.candidates ?? []).filter((c) => !hidden.has(c.entity.id)),
    [result, hidden],
  );

  const datingHumans = useMemo(
    () =>
      visible.filter(
        (c) => c.entity.type === "human" && c.entity.metadata.vertical !== "apartment",
      ),
    [visible],
  );
  const datingAis = useMemo(
    () => visible.filter((c) => c.entity.type === "ai"),
    [visible],
  );
  const listings = useMemo(
    () => visible.filter((c) => c.entity.attributes.role === "listing" || c.entity.type === "resource"),
    [visible],
  );
  const seekers = useMemo(
    () => visible.filter((c) => c.entity.attributes.role === "seeker"),
    [visible],
  );
  const others = useMemo(
    () =>
      visible.filter((c) => {
        if (vertical === "dating") {
          return (
            c.entity.type !== "human" &&
            c.entity.type !== "ai" &&
            c.entity.metadata.vertical !== "apartment"
          );
        }
        const role = c.entity.attributes.role;
        return role !== "listing" && role !== "seeker" && c.entity.type !== "resource";
      }),
    [visible, vertical],
  );

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  }

  function switchVertical(next: Vertical) {
    setVertical(next);
    setResult(null);
    setTrail([]);
    setSeen([]);
    setHidden(new Set());
    setActiveChip(0);
    if (next === "dating") setQuery(DATING_EXAMPLES[0]);
    else setQuery(apartmentSide === "offer" ? OFFER_EXAMPLES[0] : SEEK_EXAMPLES[0]);
  }

  function switchApartmentSide(next: ApartmentSide) {
    setApartmentSide(next);
    setResult(null);
    setTrail([]);
    setSeen([]);
    setHidden(new Set());
    setActiveChip(0);
    setQuery(next === "offer" ? OFFER_EXAMPLES[0] : SEEK_EXAMPLES[0]);
  }

  function apartmentConstraints(side: ApartmentSide = apartmentSide): Record<string, unknown> | undefined {
    if (vertical !== "apartment") return undefined;
    return { side: side === "offer" ? "seek" : "offer" };
  }

  async function runFind(
    context: string,
    extras: {
      entityId?: string;
      exclude?: string[];
      mode?: string;
      constraints?: Record<string, unknown>;
    } = {},
  ) {
    setLoading(true);
    try {
      const path = extras.entityId ? "/api/whoelse/more-like" : "/api/whoelse";
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context,
          entityId: extras.entityId,
          exclude: extras.exclude ?? (extras.entityId ? [extras.entityId] : seen),
          mode: extras.mode,
          constraints: extras.constraints,
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
    const constraints = apartmentConstraints();
    const next: TrailItem = { label: query, context: query, exclude: seen, constraints };
    setTrail((t) => [...t, next]);
    void runFind(query, { constraints });
  }

  function recursiveWhoElse(candidate: Candidate) {
    const context = `Who else like ${candidate.entity.name}?`;
    setQuery(context);
    setActiveChip(-1);
    setTrail((t) => [
      ...t,
      { label: `like ${candidate.entity.name}`, context, entityId: candidate.entity.id, exclude: [candidate.entity.id] },
    ]);
    void runFind(context, { entityId: candidate.entity.id, exclude: [candidate.entity.id] });
  }

  function reverseWhoElse(candidate: Candidate) {
    const isListing = candidate.entity.attributes.role === "listing" || candidate.entity.type === "resource";
    const context = isListing
      ? `Who else might be a good tenant for this listing?`
      : `Who else has something that matches these constraints?`;
    const constraints = { side: isListing ? "seek" : "offer" };
    setQuery(context);
    setActiveChip(-1);
    setApartmentSide(isListing ? "offer" : "seek");
    setTrail((t) => [
      ...t,
      {
        label: isListing ? `needs ${candidate.entity.name}` : `has like ${candidate.entity.name}`,
        context,
        entityId: candidate.entity.id,
        exclude: [candidate.entity.id],
        constraints,
      },
    ]);
    void runFind(context, {
      entityId: candidate.entity.id,
      exclude: [candidate.entity.id],
      constraints,
    });
  }

  function moreLikeThis(candidate: Candidate) {
    const context = `${query} — more like ${candidate.entity.name}`;
    setQuery(context);
    setTrail((t) => [
      ...t,
      {
        label: `more like ${candidate.entity.name}`,
        context,
        entityId: candidate.entity.id,
        exclude: [candidate.entity.id],
      },
    ]);
    void runFind(context, {
      entityId: candidate.entity.id,
      exclude: [candidate.entity.id],
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
    if (candidate.entity.type === "ai" || candidate.entity.type === "agent") {
      setChatEntity(candidate.entity);
      setChatLog([
        {
          role: "assistant",
          content: `${candidate.entity.name} is a labeled ${candidate.entity.type}, not a human. ${candidate.entity.description}`,
        },
      ]);
      setChatInput("");
      return;
    }
    if (candidate.entity.type !== "human") {
      flash(`${candidate.entity.name} is a ${candidate.entity.type} stub — no transaction ran.`);
      return;
    }
    if (candidate.entity.metadata.vertical === "apartment") {
      flash("Synthetic seeker — no message sent, no application filed.");
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

  const heading =
    vertical === "dating"
      ? "Who are you looking for?"
      : apartmentSide === "offer"
        ? "I have…"
        : "What are you looking for?";
  const cta =
    loading ? "Looking…" : vertical === "apartment" && apartmentSide === "offer" ? "Who else needs this?" : "Who else?";

  return (
    <div className="app">
      <SiteNav current="home" />

      <p className="doctrine">
        <strong>Humans ask Who Else. Agents call WhoElse. Same network.</strong>{" "}
        <a href="/ais">Connect an agent →</a>
      </p>

      <div className={`banner ${vertical === "apartment" ? "banner-demo" : ""}`}>
        {vertical === "apartment" ? (
          <>
            <strong>DEMO data.</strong> Every apartment listing and seeker is <strong>synthetic</strong> — not a real
            home, not a real person, not scraped from any site. Same WhoElse engine as dating. Same{" "}
            <code>whoelse.find</code>.
          </>
        ) : (
          <>
            Demo pool only. Every human is <strong>synthetic</strong>. Every AI is labeled AI — never a stand-in person.
            No real dating sites were used. WhoElse is for humans and machines.
          </>
        )}
      </div>

      <section className="search-panel">
        <div className="mode-tabs" role="tablist" aria-label="Vertical">
          <button
            type="button"
            role="tab"
            aria-selected={vertical === "dating"}
            className={vertical === "dating" ? "active" : ""}
            onClick={() => switchVertical("dating")}
          >
            Dating
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={vertical === "apartment"}
            className={vertical === "apartment" ? "active" : ""}
            onClick={() => switchVertical("apartment")}
          >
            Apartment
          </button>
        </div>

        {vertical === "apartment" && (
          <div className="mode-tabs side-tabs" role="tablist" aria-label="Offer or seek">
            <button
              type="button"
              role="tab"
              aria-selected={apartmentSide === "seek"}
              className={apartmentSide === "seek" ? "active" : ""}
              onClick={() => switchApartmentSide("seek")}
            >
              I need
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={apartmentSide === "offer"}
              className={apartmentSide === "offer" ? "active" : ""}
              onClick={() => switchApartmentSide("offer")}
            >
              I have
            </button>
          </div>
        )}

        <div className="eyebrow">
          {vertical === "dating"
            ? "Dating vertical · humans & AIs"
            : apartmentSide === "offer"
              ? "Apartment · I HAVE · who else needs this?"
              : "Apartment · SEEK · who else has this?"}
        </div>
        <h1>{heading}</h1>
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
            aria-label={heading}
          />
          <button className="btn btn-coral" type="button" onClick={askWhoElse} disabled={loading}>
            {cta}
          </button>
        </div>
        <div className="chips">
          {examples.map((example, i) => (
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
            {result.inferredConstraints.side ? ` · side ${String(result.inferredConstraints.side)}` : ""}
            {result.inferredConstraints.city ? ` · city ${String(result.inferredConstraints.city)}` : ""}
            {result.inferredConstraints.neighborhood
              ? ` · near ${String(result.inferredConstraints.neighborhood)}`
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
                void runFind(step.context, {
                  entityId: step.entityId,
                  exclude: step.exclude,
                  mode: step.mode,
                  constraints: step.constraints,
                });
              }}
            >
              {step.label}
            </button>
          ))}
        </div>
      )}

      {!result && (
        <p className="empty">
          {vertical === "dating"
            ? "Ask who else — not swipe. Results split humans then AIs so the type is never ambiguous."
            : apartmentSide === "offer"
              ? "Describe what you have. WhoElse finds who needs it — the reverse marketplace question."
              : "Describe the apartment you need. Same Who else? as dating. Not a listings grid."}
        </p>
      )}

      {result && vertical === "dating" && (
        <>
          <h2 className="section-title">Humans</h2>
          <div className="cards">
            {datingHumans.length === 0 && <p className="empty">No human matches in this slice.</p>}
            {datingHumans.map((c) => (
              <ResultCard
                key={c.entity.id}
                candidate={c}
                vertical="dating"
                onWhoElse={() => recursiveWhoElse(c)}
                onMore={() => moreLikeThis(c)}
                onLess={() => void lessLikeThis(c)}
                onChat={() => void chatOrInterest(c)}
              />
            ))}
          </div>

          <h2 className="section-title">AIs</h2>
          <div className="cards">
            {datingAis.length === 0 && <p className="empty">No AI matches in this slice.</p>}
            {datingAis.map((c) => (
              <ResultCard
                key={c.entity.id}
                candidate={c}
                vertical="dating"
                onWhoElse={() => recursiveWhoElse(c)}
                onMore={() => moreLikeThis(c)}
                onLess={() => void lessLikeThis(c)}
                onChat={() => void chatOrInterest(c)}
              />
            ))}
          </div>

          {others.length > 0 && (
            <>
              <h2 className="section-title">Also in the network</h2>
              <p className="empty">Agents, services, and resources — same operator, not dating profiles.</p>
              <div className="cards">
                {others.map((c) => (
                  <ResultCard
                    key={c.entity.id}
                    candidate={c}
                    vertical="dating"
                    onWhoElse={() => recursiveWhoElse(c)}
                    onMore={() => moreLikeThis(c)}
                    onLess={() => void lessLikeThis(c)}
                    onChat={() => void chatOrInterest(c)}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {result && vertical === "apartment" && (
        <>
          <h2 className="section-title">{apartmentSide === "offer" ? "People who need this" : "Who else has this"}</h2>
          <div className="cards">
            {(apartmentSide === "offer" ? seekers : listings).length === 0 && (
              <p className="empty">No matches in this slice.</p>
            )}
            {(apartmentSide === "offer" ? seekers : listings).map((c) => (
              <ResultCard
                key={c.entity.id}
                candidate={c}
                vertical="apartment"
                onWhoElse={() => recursiveWhoElse(c)}
                onReverse={() => reverseWhoElse(c)}
                onMore={() => moreLikeThis(c)}
                onLess={() => void lessLikeThis(c)}
                onChat={() => void chatOrInterest(c)}
              />
            ))}
          </div>

          {(apartmentSide === "offer" ? listings : seekers).length > 0 && (
            <>
              <h2 className="section-title">{apartmentSide === "offer" ? "Similar listings" : "People looking"}</h2>
              <div className="cards">
                {(apartmentSide === "offer" ? listings : seekers).map((c) => (
                  <ResultCard
                    key={c.entity.id}
                    candidate={c}
                    vertical="apartment"
                    onWhoElse={() => recursiveWhoElse(c)}
                    onReverse={() => reverseWhoElse(c)}
                    onMore={() => moreLikeThis(c)}
                    onLess={() => void lessLikeThis(c)}
                    onChat={() => void chatOrInterest(c)}
                  />
                ))}
              </div>
            </>
          )}

          {others.length > 0 && (
            <>
              <h2 className="section-title">Also in the network</h2>
              <div className="cards">
                {others.map((c) => (
                  <ResultCard
                    key={c.entity.id}
                    candidate={c}
                    vertical="apartment"
                    onWhoElse={() => recursiveWhoElse(c)}
                    onReverse={() => reverseWhoElse(c)}
                    onMore={() => moreLikeThis(c)}
                    onLess={() => void lessLikeThis(c)}
                    onChat={() => void chatOrInterest(c)}
                  />
                ))}
              </div>
            </>
          )}
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
  vertical,
  onWhoElse,
  onReverse,
  onMore,
  onLess,
  onChat,
}: {
  candidate: Candidate;
  vertical: Vertical;
  onWhoElse: () => void;
  onReverse?: () => void;
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
  const loc = [e.attributes.neighborhood, e.location?.city, e.location?.region].filter(Boolean).join(", ");
  const demo = String(
    e.metadata.demoLabel ??
      (e.type === "human" ? "synthetic human" : e.metadata.aiDisclosure ?? "AI — not a human"),
  );
  const role = String(e.attributes.role ?? e.type);
  const facts = listingFacts(e);

  return (
    <article className="card">
      <div className="card-top">
        <div className="identity">
          <div className={`av ${e.type === "resource" ? "resource" : e.type}`}>{initials}</div>
          <div>
            <h3>{e.name}</h3>
            <p>
              {loc || (e.type === "ai" ? "not geo-bound" : "location unset")} · {demo}
            </p>
          </div>
        </div>
        <span className={`badge ${badgeClass(e)}`}>{badgeLabel(e)}</span>
      </div>
      {facts && <p className="facts">{facts}</p>}
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
        {vertical === "apartment" && onReverse && (
          <button className="btn btn-ink btn-sm" type="button" onClick={onReverse}>
            {role === "listing" || e.type === "resource" ? "Who else needs this?" : "Who else has this?"}
          </button>
        )}
        <button className="btn btn-soft btn-sm" type="button" onClick={onMore}>
          More like this
        </button>
        <button className="btn btn-soft btn-sm" type="button" onClick={onLess}>
          Less like this
        </button>
        {vertical === "dating" && (
          <button className={`btn btn-sm ${e.type === "human" ? "btn-ink" : "btn-ai"}`} type="button" onClick={onChat}>
            {e.type === "human" ? "Chat (interest)" : e.type === "ai" || e.type === "agent" ? "Chat" : "Open"}
          </button>
        )}
      </div>
    </article>
  );
}

function listingFacts(e: Entity): string | null {
  const a = e.attributes ?? {};
  const bits: string[] = [];
  if (typeof a.bedrooms === "number") bits.push(a.bedrooms === 0 ? "studio" : `${a.bedrooms} bed`);
  if (typeof a.rent === "number" || typeof a.budget === "number") {
    const n = Number(a.rent ?? a.budget);
    const symbol = a.currency === "EUR" ? "€" : "$";
    bits.push(`${symbol}${n}${a.role === "seeker" ? " budget" : ""}`);
  }
  if (a.furnished === true) bits.push("furnished");
  if (a.pets === true) bits.push("pets ok");
  if (typeof a.listingKind === "string" && a.listingKind !== "rent") bits.push(String(a.listingKind));
  return bits.length ? bits.join(" · ") : null;
}

function badgeClass(e: Entity): string {
  if (e.attributes.role === "listing" || e.type === "resource") return "resource";
  if (e.attributes.role === "seeker") return "seeker";
  if (e.type === "human" || e.type === "ai") return e.type;
  return "ai";
}

function badgeLabel(e: Entity): string {
  if (e.attributes.role === "listing") return "Listing";
  if (e.attributes.role === "seeker") return "Seeker";
  if (e.type === "ai") return "AI";
  if (e.type === "human") return "Human";
  return e.type;
}
