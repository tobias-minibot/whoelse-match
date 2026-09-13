"use client";

import { useCallback, useEffect, useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { fetchMe, type MePayload } from "@/lib/me";
import type { WhoElsePayload } from "@/lib/types";

type PublicEntity = {
  id: string;
  name: string;
  type: string;
  description: string;
};

type PublicReceipt = {
  id: string;
  actionType: string;
  status: string;
  task?: string;
  would?: string;
  at: string;
};

type PublicMessage = {
  id: string;
  fromEntityId: string;
  body: string;
  created_at: string;
};

type MatchRow = {
  id: string;
  requesterEntityId: string;
  candidateEntityId: string;
  seekPublicationId?: string;
  offerPublicationId?: string;
  query: string;
  score?: number;
  explanation?: { why: string };
  status: string;
  created_at: string;
  updated_at: string;
  requester: PublicEntity | null;
  candidate: PublicEntity | null;
  receipts: PublicReceipt[];
  messages: PublicMessage[];
};

export function MatchesApp() {
  const [me, setMe] = useState<MePayload | null | undefined>(undefined);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [selected, setSelected] = useState<MatchRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [whoelse, setWhoelse] = useState<WhoElsePayload | null>(null);
  const [loading, setLoading] = useState(false);

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  };

  const load = useCallback(async () => {
    const res = await fetch("/api/matches");
    if (res.status === 401) {
      setError("Sign in to see matches you are a party to.");
      setMatches([]);
      return;
    }
    const data = (await res.json()) as { matches?: MatchRow[]; error?: string };
    if (!res.ok) {
      setError(data.error ?? `matches ${res.status}`);
      return;
    }
    setError(null);
    setMatches(data.matches ?? []);
    setSelected((prev) => {
      if (!prev) return data.matches?.[0] ?? null;
      return data.matches?.find((m) => m.id === prev.id) ?? data.matches?.[0] ?? null;
    });
  }, []);

  useEffect(() => {
    void fetchMe().then(setMe);
    void load();
  }, [load]);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/matches/${selected.id}/act`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) {
        flash(data.error ?? `act ${res.status}`);
        return;
      }
      flash(`${action} → ${data.receipt?.status ?? data.match?.status}`);
      setDraft("");
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function recursiveFromMatch() {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch("/api/whoelse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: selected.id, limit: 6 }),
      });
      const data = (await res.json()) as WhoElsePayload;
      if (!res.ok) {
        flash("Who else from this match failed.");
        return;
      }
      setWhoelse(data);
    } finally {
      setLoading(false);
    }
  }

  const mine = me?.entity?.id;
  const other = selected
    ? selected.requesterEntityId === mine
      ? selected.candidate
      : selected.requester
    : null;
  const iAmRequester = selected && mine && selected.requesterEntityId === mine;

  return (
    <div className="app">
      <SiteNav current="matches" />
      <p className="doctrine">
        <strong>Same objects as agents.</strong> Propose a MATCH from Who else?, act, write a
        receipt, then ask Who else? from that match. Dating is a costume.
      </p>
      <div className="banner">
        Find never saves a MATCH. <strong>Propose match</strong> on a result is the explicit act.
        Receipts update portable reputation and rerank the next find.
      </div>
      {me === null && (
        <div className="banner">
          <strong>Sign in</strong> to propose and act.{" "}
          <a href="/sign-in">Sign in →</a>
        </div>
      )}
      {me?.needsOnboarding && (
        <div className="banner">
          You need a published profile before you can propose.{" "}
          <a href="/onboarding">Finish joining →</a>
        </div>
      )}
      {error && <p className="form-error">{error}</p>}

      <div className="match-layout">
        <section className="search-panel">
          <div className="eyebrow">Your matches</div>
          <h1>Act, receipt, who else?</h1>
          {matches.length === 0 && !error && (
            <p className="empty">
              No durable matches yet. Run Who else? and press <strong>Propose match</strong>.
            </p>
          )}
          <div className="cards">
            {matches.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`card match-pick ${selected?.id === m.id ? "selected" : ""}`}
                onClick={() => {
                  setSelected(m);
                  setWhoelse(null);
                }}
              >
                <div className="card-top">
                  <div>
                    <h3>
                      {m.requester?.name ?? m.requesterEntityId} → {m.candidate?.name ?? m.candidateEntityId}
                    </h3>
                    <p>{m.query}</p>
                  </div>
                  <span className={`badge ${m.status}`}>{m.status}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {selected && (
          <section className="search-panel">
            <div className="eyebrow">Match {selected.id}</div>
            <h2 className="section-title">
              {selected.requester?.name} · {selected.candidate?.name}
            </h2>
            <p className="why">{selected.explanation?.why ?? selected.query}</p>
            <div className="status-row">
              <span className={`status-pill ${selected.status}`}>{selected.status}</span>
              {typeof selected.score === "number" && (
                <span className="status-pill">score {selected.score.toFixed(3)}</span>
              )}
              {selected.seekPublicationId && <span className="status-pill">SEEK {selected.seekPublicationId}</span>}
              {selected.offerPublicationId && <span className="status-pill">OFFER {selected.offerPublicationId}</span>}
            </div>

            <div className="actions">
              {!iAmRequester && selected.status === "proposed" && (
                <>
                  <button className="btn btn-coral btn-sm" type="button" disabled={loading} onClick={() => void act("accept")}>
                    Accept
                  </button>
                  <button className="btn btn-soft btn-sm" type="button" disabled={loading} onClick={() => void act("decline")}>
                    Decline
                  </button>
                </>
              )}
              <button className="btn btn-ink btn-sm" type="button" disabled={loading} onClick={() => void act("connect")}>
                Connect
              </button>
              <button className="btn btn-soft btn-sm" type="button" disabled={loading} onClick={() => void act("intro")}>
                Request intro
              </button>
              {other?.type === "agent" && (
                <button
                  className="btn btn-ai btn-sm"
                  type="button"
                  disabled={loading}
                  onClick={() => void act("invoke", { task: selected.query })}
                >
                  Invoke
                </button>
              )}
              <button className="btn btn-soft btn-sm" type="button" disabled={loading} onClick={() => void act("negotiate")}>
                Negotiate
              </button>
              <button className="btn btn-soft btn-sm" type="button" disabled={loading} onClick={() => void act("handoff")}>
                Handoff
              </button>
              <button className="btn btn-coral btn-sm" type="button" disabled={loading} onClick={() => void recursiveFromMatch()}>
                Who else? from this match
              </button>
            </div>

            <h2 className="section-title">Thread</h2>
            <div className="chat-log">
              {selected.messages.length === 0 && <p className="empty">No messages yet.</p>}
              {selected.messages.map((msg) => (
                <div key={msg.id} className={`bubble ${msg.fromEntityId === mine ? "user" : "assistant"}`}>
                  <strong>{msg.fromEntityId === mine ? "You" : msg.fromEntityId}</strong>
                  <div>{msg.body}</div>
                </div>
              ))}
            </div>
            <div className="search-row">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Message the other principal…"
              />
              <button
                className="btn btn-ink"
                type="button"
                disabled={loading || !draft.trim()}
                onClick={() => void act("message", { message: draft })}
              >
                Send
              </button>
            </div>

            <h2 className="section-title">Receipts</h2>
            <div className="cards">
              {selected.receipts.length === 0 && <p className="empty">No receipts yet.</p>}
              {selected.receipts.map((r) => (
                <article key={r.id} className="card">
                  <div className="card-top">
                    <div>
                      <h3>
                        {r.actionType} · {r.status}
                      </h3>
                      <p>{r.would ?? r.task}</p>
                    </div>
                    <span className={`badge ${r.status}`}>{r.id}</span>
                  </div>
                  <p className="diff">{new Date(r.at).toLocaleString()}</p>
                </article>
              ))}
            </div>

            {whoelse && (
              <>
                <h2 className="section-title">Who else? from this match</h2>
                <p className="empty">
                  Parties excluded. Query: {whoelse.query}.{" "}
                  {whoelse.candidates.length} candidates.
                </p>
                <div className="cards">
                  {whoelse.candidates.map((c) => (
                    <article key={c.entity.id} className="card">
                      <div className="card-top">
                        <div>
                          <h3>{c.entity.name}</h3>
                          <p>
                            {c.entity.type} · {c.score.toFixed(3)}
                          </p>
                        </div>
                      </div>
                      <p className="why">{c.explanation.why}</p>
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>
        )}
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
