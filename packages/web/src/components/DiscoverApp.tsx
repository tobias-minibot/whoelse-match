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

const APT_SEEK = [
  "Who else has a 1-bedroom apartment in DC under $2,500?",
  "Who else has a furnished sublet in Berlin for three months?",
  "Who else has a place near Georgetown?",
  "Who else accepts pets?",
  "Who else has something available next month?",
];

const APT_OFFER = [
  "I have a furnished 1-bedroom in Georgetown for $2,200 that allows pets",
  "Who else needs a furnished apartment in Berlin?",
  "Who else is looking for exactly the apartment I have?",
  "Who else might be a good tenant for this listing?",
  "Who else is looking for a 2-bedroom in DC?",
];

const JOB_SEEK = [
  "Who else is hiring AI people in Washington?",
  "Who else needs someone with my background?",
  "Who else is available for a two-week coding project?",
  "Who else can do this work for under $5,000?",
  "Who else could do this job — human or AI?",
];

const JOB_OFFER = [
  "I have AI engineering experience and can start immediately",
  "Who else is looking for a role like this?",
  "Who else should I recruit?",
  "Who else has done this exact kind of work before?",
  "Who else is a better fit but less obvious?",
];

const RIDE_SEEK = [
  "Who else can give me a ride from Georgetown to Dupont?",
  "Who else can give me a ride to the airport?",
  "Who else has seats to Moab Saturday?",
  "Who else can give me a ride?",
];

const RIDE_OFFER = [
  "I have 3 seats from Georgetown to Dupont Saturday",
  "Who else needs a ride to the airport?",
  "Who else needs a seat to Moab Saturday?",
];

const SVC_SEEK = [
  "Who else can fix a leak under my sink before the weekend?",
  "Who else is a licensed plumber near me?",
  "Who else can do emergency handyman work in DC?",
];

const SVC_OFFER = [
  "I am a licensed plumber available tonight",
  "Who else needs a licensed plumber?",
  "Who else needs a handyman before the weekend?",
];

type Vertical = "dating" | "apartment" | "jobs" | "rides" | "services";
type MarketSide = "seek" | "offer";
type TrailItem = {
  label: string;
  context: string;
  entityId?: string;
  exclude: string[];
  mode?: string;
  constraints?: Record<string, unknown>;
};

const VERTICALS: { id: Vertical; label: string }[] = [
  { id: "dating", label: "Dating" },
  { id: "apartment", label: "Apartment" },
  { id: "jobs", label: "Jobs" },
  { id: "rides", label: "Rides" },
  { id: "services", label: "Services" },
];

const HAS_SIDES: Vertical[] = ["apartment", "jobs", "rides", "services"];

function examplesFor(vertical: Vertical, side: MarketSide): string[] {
  if (vertical === "dating") return DATING_EXAMPLES;
  if (vertical === "apartment") return side === "offer" ? APT_OFFER : APT_SEEK;
  if (vertical === "jobs") return side === "offer" ? JOB_OFFER : JOB_SEEK;
  if (vertical === "rides") return side === "offer" ? RIDE_OFFER : RIDE_SEEK;
  return side === "offer" ? SVC_OFFER : SVC_SEEK;
}

function isDatingHuman(e: Entity): boolean {
  const v = e.metadata.vertical;
  return e.type === "human" && (!v || v === "dating");
}

function roleOf(e: Entity): string {
  return String(e.attributes.role ?? "");
}

export function DiscoverApp() {
  const [vertical, setVertical] = useState<Vertical>("dating");
  const [side, setSide] = useState<MarketSide>("seek");
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

  const examples = examplesFor(vertical, side);

  const visible = useMemo(
    () => (result?.candidates ?? []).filter((c) => !hidden.has(c.entity.id)),
    [result, hidden],
  );

  const datingHumans = useMemo(() => visible.filter((c) => isDatingHuman(c.entity)), [visible]);
  const datingAis = useMemo(() => visible.filter((c) => c.entity.type === "ai"), [visible]);
  const listings = useMemo(
    () =>
      visible.filter(
        (c) =>
          roleOf(c.entity) === "listing" ||
          (c.entity.type === "resource" && c.entity.metadata.vertical === "apartment"),
      ),
    [visible],
  );
  const seekers = useMemo(() => visible.filter((c) => roleOf(c.entity) === "seeker"), [visible]);
  const drivers = useMemo(() => visible.filter((c) => roleOf(c.entity) === "driver"), [visible]);
  const passengers = useMemo(() => visible.filter((c) => roleOf(c.entity) === "passenger"), [visible]);
  const providers = useMemo(() => visible.filter((c) => roleOf(c.entity) === "provider"), [visible]);
  const clients = useMemo(() => visible.filter((c) => roleOf(c.entity) === "client"), [visible]);
  const others = useMemo(
    () =>
      visible.filter((c) => {
        if (vertical === "dating") {
          return !isDatingHuman(c.entity) && c.entity.type !== "ai";
        }
        if (vertical === "apartment") {
          const role = roleOf(c.entity);
          return role !== "listing" && role !== "seeker" && c.entity.type !== "resource";
        }
        if (vertical === "rides") {
          const role = roleOf(c.entity);
          return role !== "driver" && role !== "passenger";
        }
        if (vertical === "services") {
          const role = roleOf(c.entity);
          return role !== "provider" && role !== "client";
        }
        return false;
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
    setSide("seek");
    setQuery(examplesFor(next, "seek")[0]);
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
    // Jobs: NL infers side/roles. Forcing a tab side hid complementary matches in tests.
    if (vertical === "dating" || vertical === "jobs") return undefined;
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
    } catch {
      flash("Discovery failed — is the server running?");
    } finally {
      setLoading(false);
    }
  }

  function askWhoElse() {
    const constraints = marketConstraints();
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
    const role = roleOf(candidate.entity);
    const hasThing = ["listing", "opening", "employer", "worker", "driver", "provider"].includes(role);
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

  const heading =
    vertical === "dating"
      ? "Who are you looking for?"
      : side === "offer"
        ? "I have…"
        : "What are you looking for?";
  const cta =
    loading ? "Looking…" : HAS_SIDES.includes(vertical) && side === "offer" ? "Who else needs this?" : "Who else?";

  const banner =
    vertical === "dating"
      ? "Demo pool only. Every human is synthetic. Every AI is labeled AI — never a stand-in person. No real dating sites were used. WhoElse is for humans and machines."
      : vertical === "apartment"
        ? "DEMO data. Every apartment listing and seeker is synthetic — not a real home, not a real person, not scraped. Same WhoElse engine. Same whoelse.find."
        : vertical === "jobs"
          ? "DEMO data. Employers, openings, freelancers, and AI workers are synthetic. Trust is evidence stubs (portfolio / outcomes / verified), not a reputation market. Same whoelse.find — never jobs.find."
          : vertical === "rides"
            ? "DEMO data. Synthetic rides with origin, destination, seats, and changing state. Not real drivers. Same whoelse.find."
            : "DEMO data. Synthetic plumbers and handypeople. Licensing is a stub field, not a credential. Same whoelse.find.";

  const eyebrow =
    vertical === "dating"
      ? "Dating vertical · humans & AIs"
      : vertical === "jobs"
        ? side === "offer"
          ? "Jobs · I HAVE · NL infers side — who needs this?"
          : "Jobs · I NEED · humans, companies, AIs in one ranked list"
        : `${vertical} · ${side === "offer" ? "I HAVE · who else needs this?" : "I NEED · who else has this?"}`;

  const emptyCopy =
    vertical === "dating"
      ? "Ask who else — not swipe. Results split humans then AIs so the type is never ambiguous."
      : vertical === "jobs"
        ? "Same Who else? as dating. Not LinkedIn. Humans, companies, and AIs share one ranked list — type stays on the badge."
        : side === "offer"
          ? "Describe what you have. WhoElse finds who needs it — the reverse marketplace question."
          : "Describe what you need. Same Who else? as dating. Not a listings grid.";

  return (
    <div className="app">
      <SiteNav current="home" />

      <p className="doctrine">
        <strong>Humans ask Who Else. Agents call WhoElse. Same network.</strong>{" "}
        <a href="/ais">Connect an agent →</a>
      </p>

      <div className={`banner ${vertical !== "dating" ? "banner-demo" : ""}`}>
        {vertical !== "dating" ? (
          <>
            <strong>DEMO data.</strong> {banner.replace(/^DEMO data\.\s*/, "")}
          </>
        ) : (
          banner
        )}
      </div>

      <section className="search-panel">
        <div className="mode-tabs" role="tablist" aria-label="Vertical">
          {VERTICALS.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={vertical === v.id}
              className={vertical === v.id ? "active" : ""}
              onClick={() => switchVertical(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>

        {HAS_SIDES.includes(vertical) && (
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

        <div className="eyebrow">{eyebrow}</div>
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
            {result.inferredVertical ? ` · NL reads as ${result.inferredVertical}` : ""}
            {result.inferredVertical && result.inferredVertical !== vertical
              ? " · tab is a costume, pool is shared"
              : ""}
            {result.inferredConstraints.side ? ` · side ${String(result.inferredConstraints.side)}` : ""}
            {Array.isArray(result.inferredConstraints.roles)
              ? ` · roles ${(result.inferredConstraints.roles as string[]).join("/")}`
              : ""}
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

      {!result && <p className="empty">{emptyCopy}</p>}

      {result && vertical === "dating" && (
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
          vertical={vertical}
          onWhoElse={recursiveWhoElse}
          onMore={moreLikeThis}
          onLess={(c) => void lessLikeThis(c)}
          onChat={(c) => void chatOrInterest(c)}
        />
      )}

      {result && vertical === "apartment" && (
        <Sectioned
          blocks={[
            {
              title: side === "offer" ? "People who need this" : "Who else has this",
              items: side === "offer" ? seekers : listings,
              empty: "No matches in this slice.",
            },
            (side === "offer" ? listings : seekers).length
              ? {
                  title: side === "offer" ? "Similar listings" : "People looking",
                  items: side === "offer" ? listings.filter((c) => roleOf(c.entity) === "listing") : seekers,
                  empty: "",
                }
              : null,
            others.length ? { title: "Also in the network", items: others, empty: "" } : null,
          ]}
          vertical={vertical}
          onWhoElse={recursiveWhoElse}
          onReverse={reverseWhoElse}
          onMore={moreLikeThis}
          onLess={(c) => void lessLikeThis(c)}
          onChat={(c) => void chatOrInterest(c)}
        />
      )}

      {result && vertical === "jobs" && (
        <Sectioned
          blocks={[
            {
              title: "Who else — mixed rank (human / company / AI)",
              items: visible,
              empty: "No matches in this slice.",
              note: "Type is louder than rank: every card keeps a HUMAN / COMPANY / AGENT / OPENING badge.",
            },
          ]}
          vertical={vertical}
          onWhoElse={recursiveWhoElse}
          onReverse={reverseWhoElse}
          onMore={moreLikeThis}
          onLess={(c) => void lessLikeThis(c)}
          onChat={(c) => void chatOrInterest(c)}
        />
      )}

      {result && vertical === "rides" && (
        <Sectioned
          blocks={[
            {
              title: side === "offer" ? "People who need a seat" : "Who else has a ride",
              items: side === "offer" ? passengers : drivers,
              empty: "No matches in this slice.",
            },
            (side === "offer" ? drivers : passengers).length
              ? {
                  title: side === "offer" ? "Similar rides" : "People looking for a seat",
                  items: side === "offer" ? drivers : passengers,
                  empty: "",
                }
              : null,
            others.length ? { title: "Also in the network", items: others, empty: "" } : null,
          ]}
          vertical={vertical}
          onWhoElse={recursiveWhoElse}
          onReverse={reverseWhoElse}
          onMore={moreLikeThis}
          onLess={(c) => void lessLikeThis(c)}
          onChat={(c) => void chatOrInterest(c)}
        />
      )}

      {result && vertical === "services" && (
        <Sectioned
          blocks={[
            {
              title: side === "offer" ? "People who need this trade" : "Who else can do this",
              items: side === "offer" ? clients : providers,
              empty: "No matches in this slice.",
            },
            (side === "offer" ? providers : clients).length
              ? {
                  title: side === "offer" ? "Similar providers" : "People looking",
                  items: side === "offer" ? providers : clients,
                  empty: "",
                }
              : null,
            others.length ? { title: "Also in the network", items: others, empty: "" } : null,
          ]}
          vertical={vertical}
          onWhoElse={recursiveWhoElse}
          onReverse={reverseWhoElse}
          onMore={moreLikeThis}
          onLess={(c) => void lessLikeThis(c)}
          onChat={(c) => void chatOrInterest(c)}
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

function Sectioned({
  blocks,
  vertical,
  onWhoElse,
  onReverse,
  onMore,
  onLess,
  onChat,
}: {
  blocks: ({ title: string; items: Candidate[]; empty: string; note?: string } | null)[];
  vertical: Vertical;
  onWhoElse: (c: Candidate) => void;
  onReverse?: (c: Candidate) => void;
  onMore: (c: Candidate) => void;
  onLess: (c: Candidate) => void;
  onChat: (c: Candidate) => void;
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
                  vertical={vertical}
                  onWhoElse={() => onWhoElse(c)}
                  onReverse={onReverse ? () => onReverse(c) : undefined}
                  onMore={() => onMore(c)}
                  onLess={() => onLess(c)}
                  onChat={() => onChat(c)}
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
  const facts = listingFacts(e);
  const evidence = evidenceLine(e);
  const showReverse = vertical !== "dating" && onReverse;

  return (
    <article className="card">
      <div className="card-top">
        <div className="identity">
          <div className={`av ${avatarClass(e)}`}>{initials}</div>
          <div>
            <h3>{e.name}</h3>
            <p>
              {loc || (e.type === "ai" || e.type === "agent" ? "not geo-bound" : "location unset")} · {demo}
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
          Who else?
        </button>
        {showReverse && (
          <button className="btn btn-ink btn-sm" type="button" onClick={onReverse}>
            {["listing", "opening", "employer", "worker", "driver", "provider"].includes(roleOf(e))
              ? "Who else needs this?"
              : "Who else has this?"}
          </button>
        )}
        <button className="btn btn-soft btn-sm" type="button" onClick={onMore}>
          More like this
        </button>
        <button className="btn btn-soft btn-sm" type="button" onClick={onLess}>
          Less like this
        </button>
        {(vertical === "dating" || e.type === "ai" || e.type === "agent") && (
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
    bits.push(`${symbol}${n}${a.role === "seeker" || a.role === "applicant" ? " budget" : ""}`);
  }
  if (typeof a.rate === "number") bits.push(`$${a.rate}${a.durationWeeks ? ` · ${a.durationWeeks}wk` : ""}`);
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
  if (role === "listing" || e.type === "resource") return "resource";
  if (role === "seeker" || role === "applicant" || role === "passenger" || role === "client") return "seeker";
  if (role === "opening" || role === "employer") return "opening";
  if (role === "worker") return e.type === "agent" ? "ai" : "worker";
  if (role === "driver" || role === "provider") return "driver";
  if (e.type === "company") return "company";
  if (e.type === "human" || e.type === "ai") return e.type;
  return "ai";
}

function badgeLabel(e: Entity): string {
  const role = roleOf(e);
  if (role === "listing") return "Listing";
  if (role === "seeker") return "Seeker";
  if (role === "opening") return "Opening";
  if (role === "employer") return "Employer";
  if (role === "applicant") return "Applicant";
  if (role === "worker") return e.type === "agent" ? "AI worker" : e.type === "company" ? "Vendor" : "Worker";
  if (role === "driver") return e.type === "human" ? "Driver" : "Ride";
  if (role === "passenger") return "Passenger";
  if (role === "provider") return "Provider";
  if (role === "client") return "Client";
  if (e.type === "ai") return "AI";
  if (e.type === "human") return "Human";
  if (e.type === "company") return "Company";
  return e.type;
}
