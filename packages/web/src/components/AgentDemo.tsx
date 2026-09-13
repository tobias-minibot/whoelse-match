"use client";

import { useState } from "react";

type DelegatePayload = {
  ok: boolean;
  task: string;
  intent: string;
  from?: string;
  found: { entity?: { id: string; name: string; type: string }; score?: number }[];
  selected?: { entity: { id: string; name: string; type: string; attributes?: Record<string, unknown> }; score: number };
  invoked?: { would: string; result: Record<string, unknown>; agent: { id: string; name: string } };
  receipt?: { id: string; fromAgentId?: string; toAgentId: string; evidence: Record<string, unknown>; would: string };
  match?: { id: string; status: string };
  reason?: string;
};

const TASK = "Verify the claim that Georgetown to Dupont is 12 minutes by car";
const INTENT = "Who else can verify this result?";
const FROM = "agent-claim-writer";
/** Labeled synthetic. Installed only when the demo seed is loaded — fails closed in production-empty. */
const SYNTHETIC_DEMO_KEY = "wek_seedowner_synthetic-demo-owner-key-not-for-prod";
const DEMO_HEADERS: HeadersInit = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${SYNTHETIC_DEMO_KEY}`,
};

export function AgentDemo() {
  const [step, setStep] = useState<"idle" | "draft" | "found" | "done" | "error">("idle");
  const [draft, setDraft] = useState<string>("");
  const [found, setFound] = useState<{ id: string; name: string; type: string; score: number }[]>([]);
  const [pairs, setPairs] = useState<{ seek: string; offer: string }[]>([]);
  const [delegated, setDelegated] = useState<DelegatePayload | null>(null);
  const [registered, setRegistered] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>("");

  async function runHeadline() {
    setBusy(true);
    setErr("");
    setPairs([]);
    try {
      const a = await fetch(`/api/agents/${FROM}/invoke`, {
        method: "POST",
        headers: DEMO_HEADERS,
        body: JSON.stringify({ task: TASK }),
      });
      const draftBody = await a.json();
      setDraft(draftBody.would ?? JSON.stringify(draftBody.result));
      setStep("draft");

      const find = await fetch("/api/whoelse", {
        method: "POST",
        headers: DEMO_HEADERS,
        body: JSON.stringify({ context: INTENT, requester: FROM, limit: 5 }),
      });
      const foundBody = await find.json();
      setFound(
        (foundBody.candidates ?? []).map((c: { entity: { id: string; name: string; type: string }; score: number }) => ({
          id: c.entity.id,
          name: c.entity.name,
          type: c.entity.type,
          score: c.score,
        })),
      );
      setPairs(
        (foundBody.pairs ?? []).map((p: { seek: { capability: string }; offer: { capability: string } }) => ({
          seek: p.seek.capability,
          offer: p.offer.capability,
        })),
      );
      setStep("found");

      const del = await fetch("/api/delegate", {
        method: "POST",
        headers: DEMO_HEADERS,
        body: JSON.stringify({ task: TASK, intent: INTENT, from: FROM, select: "evidence" }),
      });
      const delBody = (await del.json()) as DelegatePayload;
      setDelegated(delBody);
      setStep(delBody.ok ? "done" : "error");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setStep("error");
    } finally {
      setBusy(false);
    }
  }

  async function runOfferSeek() {
    setBusy(true);
    setErr("");
    setPairs([]);
    try {
      const find = await fetch("/api/whoelse", {
        method: "POST",
        headers: DEMO_HEADERS,
        body: JSON.stringify({
          context: "Who else can do calendar hold resolution?",
          requester: "agent-inbox-clerk",
          limit: 5,
        }),
      });
      const foundBody = await find.json();
      setFound(
        (foundBody.candidates ?? []).map((c: { entity: { id: string; name: string; type: string }; score: number }) => ({
          id: c.entity.id,
          name: c.entity.name,
          type: c.entity.type,
          score: c.score,
        })),
      );
      setPairs(
        (foundBody.pairs ?? []).map((p: { seek: { capability: string }; offer: { capability: string } }) => ({
          seek: p.seek.capability,
          offer: p.offer.capability,
        })),
      );
      setStep("found");
      const del = await fetch("/api/delegate", {
        method: "POST",
        headers: DEMO_HEADERS,
        body: JSON.stringify({
          task: "Resolve the Tuesday 3pm hold",
          intent: "Who else can do calendar hold resolution?",
          from: "agent-inbox-clerk",
          select: "first",
        }),
      });
      const delBody = (await del.json()) as DelegatePayload;
      setDelegated(delBody);
      setStep(delBody.ok ? "done" : "error");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setStep("error");
    } finally {
      setBusy(false);
    }
  }

  async function registerDemo() {
    setBusy(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: DEMO_HEADERS,
        body: JSON.stringify({
          name: "WebCheck Live",
          description: "Registered on this isolate. Verifies web claims.",
          offers: ["web verification", "verify this result"],
          cost: 1,
          latency: 25,
          evidence: { verified: true, verifiedBy: "self-asserted-registration" },
        }),
      });
      const body = await res.json();
      setRegistered(body.entity ? `${body.entity.name} (${body.entity.id})` : JSON.stringify(body));
    } finally {
      setBusy(false);
    }
  }

  const selected = delegated?.selected?.entity;

  return (
    <section className="search-panel agent-demo">
      <div className="eyebrow">Headline demo · agent → whoelse.find → agent → receipt</div>
      <h2 className="section-title">A cannot verify → find B → invoke → evidence</h2>
      <p className="lede">
        ClaimWriter gets a verification task it cannot do. The same <code>whoelse.find</code> returns candidates.
        Delegate picks on evidence (not a score market), invokes Checkmate, writes a receipt.
      </p>
      <div className="actions">
        <button className="btn btn-coral" type="button" onClick={() => void runHeadline()} disabled={busy}>
          {busy ? "Running…" : "Run A → B demo"}
        </button>
        <button className="btn btn-ink" type="button" onClick={() => void runOfferSeek()} disabled={busy}>
          InboxClerk SEEK → Holdwright OFFER
        </button>
        <button className="btn btn-soft" type="button" onClick={() => void registerDemo()} disabled={busy}>
          Register an agent
        </button>
      </div>
      {registered && <p className="facts">Registered: {registered} — process-local, then call whoelse.find</p>}
      {err && <p className="empty">{err}</p>}
      {draft && (
        <p className="why">
          <strong>A (ClaimWriter):</strong> {draft}
        </p>
      )}
      {found.length > 0 && (
        <div>
          <p className="facts">Candidates from whoelse.find</p>
          <ul className="plain">
            {found.map((f) => (
              <li key={f.id}>
                {f.name} ({f.type}) · {f.score.toFixed(3)}
              </li>
            ))}
          </ul>
          {pairs.length > 0 && (
            <p className="facts">
              Pairs: {pairs.map((p) => `SEEK ${p.seek} ↔ OFFER ${p.offer}`).join(" · ")}
            </p>
          )}
        </div>
      )}
      {delegated?.ok && selected && (
        <div className="infer-panel">
          <p>
            <strong>Chose B:</strong> {selected.name} because select=evidence (verified/outcomes over rank alone).
          </p>
          <p>
            <strong>Delegated:</strong> {delegated.task}
          </p>
          <p>
            <strong>Invoked:</strong> {delegated.invoked?.would}
          </p>
          <p>
            <strong>Success:</strong> {String(delegated.match?.status ?? "invoked")} · receipt{" "}
            <code>{delegated.receipt?.id}</code>
          </p>
          <p className="facts evidence">
            New evidence: {JSON.stringify(delegated.receipt?.evidence)}
          </p>
        </div>
      )}
      {step === "error" && delegated?.reason && <p className="empty">{delegated.reason}</p>}
    </section>
  );
}
