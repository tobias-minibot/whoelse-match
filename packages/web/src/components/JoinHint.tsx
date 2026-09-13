"use client";

import { useEffect, useState } from "react";
import { fetchMe, type MePayload } from "@/lib/me";

export function JoinHint() {
  const [me, setMe] = useState<MePayload | null | undefined>(undefined);

  useEffect(() => {
    void fetchMe().then(setMe);
  }, []);

  if (me === undefined || me === null) return null;
  if (me.findable) return null;

  if (me.needsOnboarding) {
    return (
      <div className="banner">
        <strong>You're signed in, not in the pool yet.</strong> Write a short human profile and publish
        at least one SEEK or OFFER.{" "}
        <a href="/onboarding">Finish joining →</a>
      </div>
    );
  }

  return (
    <div className="banner">
      <strong>Your profile is private.</strong> Affirm that you are 18+ before Who else? can show you.{" "}
      <a href="/me">Open profile →</a>
    </div>
  );
}
