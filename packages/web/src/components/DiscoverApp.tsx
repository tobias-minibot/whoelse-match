"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { JoinHint } from "@/components/JoinHint";
import { SiteNav } from "@/components/SiteNav";
import { fetchMe, type MePayload } from "@/lib/me";
import { CompilePanel, type CompilePayload } from "@/components/CompilePanel";
import { AMAZE_PROMPTS, amazeBySlug, parseShareParams, sharePath } from "@/lib/share";
import {
  examplesFor,
  FORCE_SIDE,
  HAS_SIDES,
  LENSES,
  OFFER_SIDE_ROLES,
  PRIMARY_LENSES,
  isPrimaryLens,
  lensById,
  type MarketSide,
  type Vertical,
} from "@/lib/lenses";
import type { Candidate, Entity, WhoElsePayload } from "@/lib/types";

type Costume = Vertical | "any";

type TrailItem = {
  label: string;
  context: string;
  entityId?: string;
  exclude: string[];
  mode?: string;
  constraints?: Record<string, unknown>;
};

function isDatingHuman(e: Entity): boolean {
  const v = e.metadata.vertical;
  return e.type === "human" && (!v || v === "dating");
}

function roleOf(e: Entity): string {
  return String(e.attributes.role ?? "");
}

export function DiscoverApp() {
  const searchParams = useSearchParams();
  const params = useParams();
  const [costume, setCostume] = useState<Costume>("any");
  const [side, setSide] = useState<MarketSide>("seek");
  const [query, setQuery] = useState(AMAZE_PROMPTS[0].query);
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
  const [me, setMe] = useState<MePayload | null>(null);
  const [compiled, setCompiled] = useState<CompilePayload | null>(null);
  const [compiling, setCompiling] = useState(false);
  const [liveEmpty, setLiveEmpty] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    void fetchMe().then((payload) => setMe(payload));
    void fetch("/api/health")
      .then((res) => res.json())
      .then((health) => {
        const n = Object.values(health.byType ?? {}).reduce(
          (sum: number, count) => sum + Number(count ?? 0),
          0,
        );
        setLiveEmpty(health.seedMode === "empty" && n === 0);
      })
      .catch(() => undefined);
  }, []);

  const vertical: Vertical = costume === "any" ? "dating" : costume;
  const examples = costume === "any" ? AMAZE_PROMPTS.map((p) => p.query) : examplesFor(vertical, side);
  const playground = result?.pool === "playground" || (!result && liveEmpty);

  const visible = useMemo(
    () => (result?.candidates ?? []).filter((c) => !hidden.has(c.entity.id)),
    [result, hidden],
  );

  const datingHumans = useMemo(() => visible.filter((c) => isDatingHuman(c.entity)), [visible]);
  const datingAis = useMemo(() => visible.filter((c) => c.entity.type === "ai"), [visible]);
  const lens = lensById(vertical);
  const offerCards = useMemo(
    () =>
      visible.filter((c) => {
        const role = roleOf(c.entity);
        if (lens.offerRoles.includes(role)) return true;
        if (vertical === "apartment" && c.entity.type === "resource" && c.entity.metadata.vertical === "apartment") {
          return role === "listing" || !role;
        }
        return false;
      }),
    [visible, lens, vertical],
  );
  const seekCards = useMemo(
    () => visible.filter((c) => lens.seekRoles.includes(roleOf(c.entity))),
    [visible, lens],
  );
  const others = useMemo(
    () =>
      visible.filter((c) => {
        if (costume !== "dating") return false;
        return !isDatingHuman(c.entity) && c.entity.type !== "ai";
      }),
    [visible, costume],
  );

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 4000);
  }

  function syncUrl(context: string, extras: { entityId?: string } = {}) {
    const path = sharePath(context, {
      entityId: extras.entityId,
      costume: costume === "any" ? undefined : costume,
    });
    window.history.replaceState(null, "", path);
  }

  function switchCostume(next: Costume) {
    setCostume(next);
    setResult(null);
    setTrail([]);
    setSeen([]);
    setHidden(new Set());
    setActiveChip(0);
    setSide("seek");
    setCompiled(null);
    if (next === "any") {
      setQuery(AMAZE_PROMPTS[0].query);
    } else {
      setQuery(examplesFor(next, "seek")[0]);
    }
  }

  function switchSide(next: MarketSide) {
    setSide(next);
    setResult(null);
    setTrail([]);
    setSeen([]);
    setHidden(new Set());
    setActiveChip(0);
    setQuery(examplesFor(vertical, next)[0]);
  }

  function marketConstraints(s: MarketSide = side): Record<string, unknown> | undefined {
    if (costume === "any") return undefined;
    if (!FORCE_SIDE.includes(vertical)) return undefined;
    return { side: s === "offer" ? "seek" : "offer" };
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
      syncUrl(context, { entityId: extras.entityId });
    } catch {
      flash("Discovery failed — is the server running?");
    } finally {
      setLoading(false);
    }
  }

  function askWhoElse(nextQuery = query) {
    const q = nextQuery.trim();
    if (!q) return;
    setQuery(q);
    const constraints = marketConstraints();
    const next: TrailItem = { label: q, context: q, exclude: seen, constraints };
    setTrail((t) => [...t, next]);
    void runFind(q, { constraints });
    void compileQuiet(q);
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
    const role = roleOf(candidate.entity);
    const hasThing = OFFER_SIDE_ROLES.includes(role);
    const context = hasThing
      ? `Who else needs what ${candidate.entity.name} has?`
      : `Who else has what ${candidate.entity.name} needs?`;
    const constraints = { side: hasThing ? "seek" : "offer" };
    setQuery(context);
    setActiveChip(-1);
    setSide(hasThing ? "offer" : "seek");
    setTrail((t) => [
      ...t,
      {
        label: hasThing ? `needs ${candidate.entity.name}` : `has like ${candidate.entity.name}`,
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

  async function proposeMatch(candidate: Candidate) {
    if (!me?.entity?.id) {
      flash(me === null ? "Sign in to propose a match." : "Finish joining before you can propose.");
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
        explanation: { why: candidate.explanation.why, commonalities: candidate.explanation.commonalities },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      flash(data.error ?? `propose ${res.status}`);
      return;
    }
    flash(`Match proposed with ${candidate.entity.name}.`);
    window.setTimeout(() => {
      window.location.href = "/matches";
    }, 700);
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
    if (candidate.entity.metadata.vertical && candidate.entity.metadata.vertical !== "dating") {
      flash("Synthetic card — no message sent, no application filed, no booking.");
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

  async function compileQuiet(text: string) {
    setCompiling(true);
    try {
      const res = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, find: false }),
      });
      setCompiled((await res.json()) as CompilePayload);
    } catch {
      setCompiled(null);
    } finally {
      setCompiling(false);
    }
  }

  async function copyLink(targetQuery = query, entityId?: string) {
    const url = `${window.location.origin}${sharePath(targetQuery, {
      entityId,
      costume: costume === "any" ? undefined : costume,
    })}`;
    try {
      await navigator.clipboard.writeText(url);
      flash("Link copied — send it to a friend.");
    } catch {
      flash(url);
    }
  }

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const slug = typeof params.slug === "string" ? params.slug : undefined;
    const featured = slug ? amazeBySlug(slug) : undefined;
    const parsed = parseShareParams(searchParams);
    if (parsed.costume && parsed.costume !== "any") {
      setCostume(parsed.costume as Vertical);
    }
    const nextQuery = parsed.query || featured?.query;
    if (!nextQuery) return;
    setQuery(nextQuery);
    setActiveChip(AMAZE_PROMPTS.findIndex((p) => p.query === nextQuery));
    const like = parsed.entityId;
    setTrail([{ label: nextQuery, context: nextQuery, entityId: like, exclude: like ? [like] : [] }]);
    void runFind(nextQuery, { entityId: like, exclude: like ? [like] : [] });
    void compileQuiet(nextQuery);
    // First paint only — shared links should run immediately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mixed = costume === "any" || lens.mixed || costume === "agents" || costume === "experts";
  const dating = costume === "dating";
  const moreLenses = LENSES.filter((v) => !isPrimaryLens(v.id));
  const cta = loading ? "Looking…" : HAS_SIDES.includes(vertical) && costume !== "any" && side === "offer" ? "Who else needs this?" : "Who else?";

  return (
    <div className="app">
      <SiteNav current="home" />

      <p className="doctrine">
        Type it like a text. Ask again from any card.{" "}
        <a href="/ais">For AIs →</a>
        {" · "}
        <a href="/onboarding">Join as a human</a>
      </p>

      <JoinHint />

      {playground && (
        <div className="banner banner-playground" role="status">
          <strong>Playground — not the live network yet.</strong> These cards are labeled demo so
          you can feel Who else? before people show up. Live matches, when they exist, come first.
          Never mixed in.
        </div>
      )}
      {!playground && result?.pool === "live" && (
        <div className="banner">
          Live network. Type is on the badge. Recursive Who else? is the product.
        </div>
      )}

      <section className="search-panel magic-panel">
        <div className="eyebrow">Who else?</div>
        <h1>Who else can do this — or wants this?</h1>
        <p className="lede magic-lede">
          One box. No categories required. Dating, agents, and experts are costumes on the same
          question.
        </p>
        <div className="search-row magic-row">
          <textarea
            value={query}
            placeholder="Who else can fix this? Who else wants to meet tonight?"
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
            aria-label="Who else?"
          />
          <div className="magic-actions">
            <button className="btn btn-coral" type="button" onClick={() => askWhoElse()} disabled={loading}>
              {cta}
            </button>
            <button className="btn btn-soft" type="button" onClick={() => void copyLink()} disabled={!query.trim()}>
              Copy link
            </button>
          </div>
        </div>
        <div className="chips amaze-chips">
          {examples.map((example, i) => (
            <button
              key={example}
              type="button"
              className={activeChip === i ? "active" : ""}
              onClick={() => {
                setQuery(example);
                setActiveChip(i);
                askWhoElse(example);
              }}
            >
              {chipLabel(example)}
            </button>
          ))}
        </div>

        <div className="costume-row">
          <span className="costume-label">Costume</span>
          <div className="mode-tabs lens-primary" role="tablist" aria-label="Costumes">
            <button
              type="button"
              role="tab"
              aria-selected={costume === "any"}
              className={costume === "any" ? "active" : ""}
              onClick={() => switchCostume("any")}
            >
              Any
            </button>
            {PRIMARY_LENSES.map((id) => {
              const v = lensById(id);
              return (
                <button
                  key={v.id}
                  type="button"
                  role="tab"
                  aria-selected={costume === v.id}
                  className={costume === v.id ? "active" : ""}
                  onClick={() => switchCostume(v.id)}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
          <details className="lens-more" open={costume !== "any" && !isPrimaryLens(vertical)}>
            <summary>More costumes</summary>
            <div className="mode-tabs" role="tablist" aria-label="More costumes">
              {moreLenses.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  role="tab"
                  aria-selected={costume === v.id}
                  className={costume === v.id ? "active" : ""}
                  onClick={() => switchCostume(v.id)}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </details>
        </div>

        {HAS_SIDES.includes(vertical) && costume !== "any" && (
          <div className="mode-tabs side-tabs" role="tablist" aria-label="Offer or seek">
            <button
              type="button"
              role="tab"
              aria-selected={side === "seek"}
              className={side === "seek" ? "active" : ""}
              onClick={() => switchSide("seek")}
            >
              I need
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={side === "offer"}
              className={side === "offer" ? "active" : ""}
              onClick={() => switchSide("offer")}
            >
              I have
            </button>
          </div>
        )}

        <details className="heard-details">
          <summary>{compiling ? "Hearing that…" : compiled ? "How WhoElse heard this" : "Compile stays offstage"}</summary>
          <CompilePanel
            result={compiled}
            onUseIntent={(intent) => {
              setQuery(intent);
              void runFind(intent, { constraints: marketConstraints() });
            }}
          />
        </details>
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
        <p className="empty magic-empty">
          Press Who else? or tap a spark. Every card has <strong>Who else like this?</strong> — that is
          how it gets addictive.
        </p>
      )}

      {result && dating && (
        <Sectioned
          blocks={[
            { title: "Humans", items: datingHumans, empty: "No human matches in this slice." },
            { title: "AIs", items: datingAis, empty: "No AI matches in this slice." },
            others.length
              ? {
                  title: "Also in the network",
                  items: others,
                  empty: "",
                  note: "Agents, services, and resources — same operator, not dating profiles.",
                }
              : null,
          ]}
          playground={result.pool === "playground"}
          onWhoElse={recursiveWhoElse}
          onShare={(c) => void copyLink(`Who else like ${c.entity.name}?`, c.entity.id)}
          onReverse={reverseWhoElse}
          onMore={moreLikeThis}
          onLess={(c) => void lessLikeThis(c)}
          onChat={(c) => void chatOrInterest(c)}
          onPropose={(c) => void proposeMatch(c)}
        />
      )}

      {result && !dating && mixed && (
        <Sectioned
          blocks={[
            {
              title: "Who else",
              items: visible,
              empty: "No matches in this slice.",
            },
          ]}
          playground={result.pool === "playground"}
          onWhoElse={recursiveWhoElse}
          onShare={(c) => void copyLink(`Who else like ${c.entity.name}?`, c.entity.id)}
          onReverse={reverseWhoElse}
          onMore={moreLikeThis}
          onLess={(c) => void lessLikeThis(c)}
          onChat={(c) => void chatOrInterest(c)}
          onPropose={(c) => void proposeMatch(c)}
        />
      )}

      {result && !dating && !mixed && (
        <Sectioned
          blocks={[
            {
              title: side === "offer" ? "Who else needs this" : "Who else has this",
              items: side === "offer" ? seekCards : offerCards,
              empty: "No matches in this slice.",
            },
            (side === "offer" ? offerCards : seekCards).length
              ? {
                  title: side === "offer" ? "Similar offers" : "People looking",
                  items: side === "offer" ? offerCards : seekCards,
                  empty: "",
                }
              : null,
            visible.filter((c) => !offerCards.includes(c) && !seekCards.includes(c)).length
              ? {
                  title: "Also in the network",
                  items: visible.filter((c) => !offerCards.includes(c) && !seekCards.includes(c)),
                  empty: "",
                }
              : null,
          ]}
          playground={result.pool === "playground"}
          onWhoElse={recursiveWhoElse}
          onShare={(c) => void copyLink(`Who else like ${c.entity.name}?`, c.entity.id)}
          onReverse={reverseWhoElse}
          onMore={moreLikeThis}
          onLess={(c) => void lessLikeThis(c)}
          onChat={(c) => void chatOrInterest(c)}
          onPropose={(c) => void proposeMatch(c)}
        />
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

function chipLabel(example: string): string {
  const featured = AMAZE_PROMPTS.find((p) => p.query === example);
  if (featured) return featured.label;
  return example.length > 42 ? `${example.slice(0, 40)}…` : example;
}

function Sectioned({
  blocks,
  playground,
  onWhoElse,
  onShare,
  onReverse,
  onMore,
  onLess,
  onChat,
  onPropose,
}: {
  blocks: ({ title: string; items: Candidate[]; empty: string; note?: string } | null)[];
  playground: boolean;
  onWhoElse: (c: Candidate) => void;
  onShare: (c: Candidate) => void;
  onReverse?: (c: Candidate) => void;
  onMore: (c: Candidate) => void;
  onLess: (c: Candidate) => void;
  onChat: (c: Candidate) => void;
  onPropose: (c: Candidate) => void;
}) {
  return (
    <>
      {blocks.map((block) => {
        if (!block) return null;
        return (
          <div key={block.title}>
            <h2 className="section-title">{block.title}</h2>
            {block.note && <p className="empty">{block.note}</p>}
            <div className="cards">
              {block.items.length === 0 && block.empty && <p className="empty">{block.empty}</p>}
              {block.items.map((c) => (
                <ResultCard
                  key={c.entity.id}
                  candidate={c}
                  playground={playground}
                  onWhoElse={() => onWhoElse(c)}
                  onShare={() => onShare(c)}
                  onReverse={onReverse ? () => onReverse(c) : undefined}
                  onMore={() => onMore(c)}
                  onLess={() => onLess(c)}
                  onChat={() => onChat(c)}
                  onPropose={() => onPropose(c)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

function ResultCard({
  candidate,
  playground,
  onWhoElse,
  onShare,
  onReverse,
  onMore,
  onLess,
  onChat,
  onPropose,
}: {
  candidate: Candidate;
  playground: boolean;
  onWhoElse: () => void;
  onShare: () => void;
  onReverse?: () => void;
  onMore: () => void;
  onLess: () => void;
  onChat: () => void;
  onPropose: () => void;
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
  const facts = listingFacts(e);
  const evidence = evidenceLine(e);
  const showReverse = Boolean(onReverse);

  return (
    <article className="card">
      <div className="card-top">
        <div className="identity">
          <div className={`av ${avatarClass(e)}`}>{initials}</div>
          <div>
            <h3>{e.name}</h3>
            <p>
              {loc || (e.type === "ai" || e.type === "agent" ? "not geo-bound" : "location unset")} ·{" "}
              {playground || e.provenance !== "user" ? demo : "live"}
            </p>
          </div>
        </div>
        <span className={`badge ${badgeClass(e)}`}>{badgeLabel(e)}</span>
      </div>
      {facts && <p className="facts">{facts}</p>}
      {evidence && <p className="facts evidence">{evidence}</p>}
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
          Who else like this?
        </button>
        <button className="btn btn-soft btn-sm" type="button" onClick={onShare}>
          Share
        </button>
        {showReverse && (
          <button className="btn btn-ink btn-sm" type="button" onClick={onReverse}>
            {OFFER_SIDE_ROLES.includes(roleOf(e)) ? "Who else needs this?" : "Who else has this?"}
          </button>
        )}
        <button className="btn btn-ink btn-sm" type="button" onClick={onPropose}>
          Propose match
        </button>
        <button className="btn btn-soft btn-sm" type="button" onClick={onMore}>
          More like this
        </button>
        <button className="btn btn-soft btn-sm" type="button" onClick={onLess}>
          Less like this
        </button>
        {(e.type === "human" || e.type === "ai" || e.type === "agent") && (
          <button className={`btn btn-sm ${e.type === "human" ? "btn-ink" : "btn-ai"}`} type="button" onClick={onChat}>
            {e.type === "human" ? "Chat (interest)" : "Chat"}
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
    bits.push(`${symbol}${n}${a.role === "seeker" || a.role === "applicant" ? " budget" : ""}`);
  }
  if (typeof a.rate === "number") bits.push(`$${a.rate}${a.durationWeeks ? ` · ${a.durationWeeks}wk` : ""}`);
  if (typeof a.price === "number") bits.push(`$${a.price}`);
  if (typeof a.ticketSize === "number") bits.push(`$${(Number(a.ticketSize) / 1000).toFixed(0)}k ticket`);
  if (typeof a.sku === "string") bits.push(`sku ${a.sku}`);
  if (a.inStock === true) bits.push("in stock");
  if (a.inStock === false) bits.push("sold out");
  if (a.openNow === true) bits.push("open now");
  if (a.deliverToday === true) bits.push("deliver today");
  if (a.gpu === true) bits.push("GPU");
  if (typeof a.latencyMs === "number") bits.push(`${a.latencyMs}ms`);
  if (typeof a.durationNights === "number") bits.push(`${a.durationNights} night`);
  if (typeof a.when === "string") bits.push(String(a.when));
  if (typeof a.stage === "string") bits.push(String(a.stage));
  if (typeof a.roleTitle === "string") bits.push(String(a.roleTitle));
  if (a.start === "immediate") bits.push("starts immediately");
  if (typeof a.origin === "string" && typeof a.destination === "string") {
    bits.push(`${a.origin} → ${a.destination}`);
  }
  if (typeof a.seats === "number") bits.push(`${a.seats} seats`);
  if (typeof a.state === "string") bits.push(String(a.state));
  if (a.licensed === true) bits.push("licensed");
  if (typeof a.urgency === "string" && a.urgency !== "normal") bits.push(String(a.urgency));
  if (a.furnished === true) bits.push("furnished");
  if (a.pets === true) bits.push("pets ok");
  if (typeof a.listingKind === "string" && a.listingKind !== "rent") bits.push(String(a.listingKind));
  return bits.length ? bits.join(" · ") : null;
}

function evidenceLine(e: Entity): string | null {
  const ev = e.trust?.evidence;
  if (!ev) return null;
  const bits: string[] = [];
  if (ev.verified) bits.push("verified stub");
  if (ev.outcomes?.length) bits.push(`${ev.outcomes.length} past outcome${ev.outcomes.length > 1 ? "s" : ""}`);
  if (ev.portfolio?.length) bits.push("portfolio");
  if (ev.licenses?.length) bits.push(`license: ${ev.licenses[0]}`);
  return bits.length ? `Evidence · ${bits.join(" · ")}` : null;
}

function avatarClass(e: Entity): string {
  const role = roleOf(e);
  if (role === "listing" || e.type === "resource") return "resource";
  if (e.type === "company") return "company";
  if (e.type === "human" || e.type === "ai" || e.type === "agent") return e.type;
  return "ai";
}

function badgeClass(e: Entity): string {
  const role = roleOf(e);
  if (role === "listing" || e.type === "resource" || e.type === "product" || e.type === "dataset") return "resource";
  if (
    role === "seeker" ||
    role === "applicant" ||
    role === "passenger" ||
    role === "client" ||
    role === "buyer" ||
    role === "founder" ||
    role === "asker" ||
    role === "attendee" ||
    role === "parent" ||
    role === "workload" ||
    role === "researcher"
  ) {
    return "seeker";
  }
  if (role === "opening" || role === "employer" || role === "event") return "opening";
  if (role === "worker" || role === "expert" || role === "investor" || role === "caregiver") {
    return e.type === "agent" ? "ai" : "worker";
  }
  if (role === "driver" || role === "provider" || role === "seller" || role === "speaker" || role === "compute" || role === "publisher") {
    return "driver";
  }
  if (e.type === "company" || e.type === "community") return "company";
  if (e.type === "human" || e.type === "ai") return e.type;
  return "ai";
}

function badgeLabel(e: Entity): string {
  const role = roleOf(e);
  if (role === "listing") return e.metadata.vertical === "travel" ? "Stay" : "Listing";
  if (role === "seeker") return e.metadata.vertical === "travel" ? "Traveler" : "Seeker";
  if (role === "opening") return "Opening";
  if (role === "employer") return "Employer";
  if (role === "applicant") return "Applicant";
  if (role === "worker") return e.type === "agent" ? "AI worker" : e.type === "company" ? "Vendor" : "Worker";
  if (role === "driver") return e.type === "human" ? "Driver" : "Ride";
  if (role === "passenger") return "Passenger";
  if (role === "provider") return "Provider";
  if (role === "client") return "Client";
  if (role === "seller") return e.type === "product" ? "Product" : "Seller";
  if (role === "buyer") return "Buyer";
  if (role === "investor") return "Investor";
  if (role === "founder") return "Founder";
  if (role === "expert") return e.type === "ai" ? "AI expert" : "Expert";
  if (role === "asker") return "Asker";
  if (role === "speaker") return "Speaker";
  if (role === "event") return e.type === "community" ? "Community" : "Event";
  if (role === "attendee") return "Attendee";
  if (role === "caregiver") return e.type === "ai" ? "AI match" : "Caregiver";
  if (role === "parent") return "Parent";
  if (role === "compute") return "Compute";
  if (role === "workload") return "Workload";
  if (role === "publisher") return e.type === "dataset" ? "Dataset" : "Publisher";
  if (role === "researcher") return "Researcher";
  if (e.type === "ai") return "AI";
  if (e.type === "human") return "Human";
  if (e.type === "company") return "Company";
  if (e.type === "community") return "Community";
  if (e.type === "product") return "Product";
  if (e.type === "dataset") return "Dataset";
  return e.type;
}
