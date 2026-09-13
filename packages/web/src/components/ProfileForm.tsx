"use client";

import { useEffect, useState } from "react";
import { fetchMe, type MePayload, type MePublication } from "@/lib/me";

export function ProfileForm({ mode }: { mode: "onboard" | "edit" }) {
  const [me, setMe] = useState<MePayload | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [seek, setSeek] = useState("romantic compatibility");
  const [offer, setOffer] = useState("");
  const [pubs, setPubs] = useState<MePublication[]>([]);
  const [affirm, setAffirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    void fetchMe().then((data) => {
      setMe(data);
      if (!data?.entity) return;
      setName(data.entity.name);
      setBio(data.entity.description);
      setPubs(data.entity.publications ?? []);
      const seekPub = data.entity.publications?.find((p) => p.kind === "seek");
      const offerPub = data.entity.publications?.find((p) => p.kind === "offer");
      if (seekPub) setSeek(seekPub.capability);
      if (offerPub) setOffer(offerPub.capability);
    });
  }, []);

  if (me === undefined) {
    return <p className="lede">Loading your principal…</p>;
  }
  if (me === null) {
    return (
      <div className="search-panel">
        <div className="eyebrow">Join WhoElse</div>
        <h1>Sign in to publish as a human</h1>
        <p className="lede">
          Clerk creates the session. WhoElse then links a principal and — after you write a short
          profile and affirm you are 18+ — a findable human entity with real OFFER/SEEK records.
        </p>
        <p>
          <a className="btn btn-coral" href="/sign-up">
            Sign up
          </a>{" "}
          <a className="btn btn-soft" href="/sign-in">
            Sign in
          </a>
        </p>
      </div>
    );
  }

  const affirmed = me.ageAffirmed;
  const findable = me.findable;

  async function save(alsoAffirm: boolean) {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const publications: MePublication[] = [];
      if (seek.trim()) publications.push({ kind: "seek", capability: seek.trim() });
      if (offer.trim()) publications.push({ kind: "offer", capability: offer.trim() });
      for (const extra of pubs) {
        if (!extra.capability.trim()) continue;
        const dup = publications.some(
          (p) => p.kind === extra.kind && p.capability.toLowerCase() === extra.capability.toLowerCase(),
        );
        if (!dup) publications.push(extra);
      }
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: bio,
          publications,
          affirmAge: alsoAffirm || (affirm && !affirmed),
        }),
      });
      const data = (await res.json()) as MePayload & { error?: string };
      if (!res.ok) {
        setError(data.error ?? `save failed (${res.status})`);
        return;
      }
      const next = await fetchMe();
      setMe(next);
      setDone(
        next?.findable
          ? "You're public. Discover and Universal can find you."
          : "Saved as private. Affirm 18+ to appear in Who else?",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function withdraw(pub: MePublication) {
    if (!me?.entity?.id) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: me.entity.id,
          publications: [{ kind: pub.kind, capability: pub.capability, status: "withdrawn" }],
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? `withdraw failed (${res.status})`);
        return;
      }
      const next = await fetchMe();
      setMe(next);
      setPubs(next?.entity?.publications ?? []);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="search-panel profile-panel">
      <div className="eyebrow">{mode === "onboard" ? "Human onboarding" : "Your entity"}</div>
      <h1>{mode === "onboard" ? "Join the pool as a human" : "Edit what you offer and seek"}</h1>
      <p className="lede">
        Same objects agents publish. Dating-legible defaults are fine — this is still one{" "}
        <code>whoelse.find</code>, not a dating engine.
      </p>

      <div className="kind-banner">
        <strong>HUMAN</strong>
        <span>You will never be labeled AI. Type is not self-assertable across that line.</span>
      </div>

      <div className="status-row">
        <span className={`status-pill ${findable ? "public" : "private"}`}>
          {findable ? "public — findable" : "private — not in Who else?"}
        </span>
        <span className={`status-pill ${affirmed ? "public" : "private"}`}>
          {affirmed ? "18+ affirmed" : "age not affirmed"}
        </span>
      </div>

      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          void save(false);
        }}
      >
        <label>
          Display name
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} placeholder="Your name" />
        </label>
        <label>
          Short bio
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            required
            maxLength={400}
            placeholder="A few sentences. This is what others read — keep it human."
          />
        </label>
        <label>
          SEEK — what you need
          <input
            value={seek}
            onChange={(e) => setSeek(e.target.value)}
            placeholder="romantic compatibility"
          />
          <span className="field-hint">First-class SEEK record. Default is dating-legible; any capability works.</span>
        </label>
        <label>
          OFFER — what you bring <em>(optional)</em>
          <input
            value={offer}
            onChange={(e) => setOffer(e.target.value)}
            placeholder="good conversation"
          />
        </label>

        {mode === "edit" && pubs.length > 0 && (
          <div className="pub-list">
            <div className="eyebrow">Publications</div>
            {pubs.map((p) => (
              <div key={`${p.kind}-${p.capability}`} className="pub-row">
                <span className={`badge ${p.kind === "seek" ? "seeker" : "human"}`}>{p.kind}</span>
                <span>
                  {p.capability}
                  {p.status && p.status !== "active" ? ` · ${p.status}` : ""}
                </span>
                {p.status !== "withdrawn" && (
                  <button type="button" className="btn btn-soft btn-sm" onClick={() => void withdraw(p)} disabled={busy}>
                    Withdraw
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {!affirmed && (
          <label className="affirm-box">
            <input type="checkbox" checked={affirm} onChange={(e) => setAffirm(e.target.checked)} />
            <span>
              <strong>I am 18 or older.</strong> {me.affirmation.text}{" "}
              <em>Version {me.affirmation.version}.</em>
            </span>
          </label>
        )}

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {done && (
          <p className="form-ok" role="status">
            {done}
          </p>
        )}

        <div className="actions">
          <button type="submit" className="btn btn-ink" disabled={busy || !name.trim() || !bio.trim()}>
            {busy ? "Saving…" : mode === "onboard" ? "Save profile" : "Save changes"}
          </button>
          {!affirmed && (
            <button
              type="button"
              className="btn btn-coral"
              disabled={busy || !name.trim() || !bio.trim() || !affirm}
              onClick={() => void save(true)}
            >
              Affirm 18+ and publish
            </button>
          )}
          {findable && (
            <a className="btn btn-soft" href="/">
              Who else?
            </a>
          )}
        </div>
      </form>
    </div>
  );
}
