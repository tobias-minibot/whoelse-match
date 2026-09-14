import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy — WhoElse" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy">
      <p className="lede">
        WhoElse stores the minimum needed to run a match network: your Clerk account, an owned human
        entity, OFFER/SEEK publications you write, MATCH/ACT/RECEIPT rows you create, and hashed
        agent keys. Public find strips private preferences, credentials, and ownership internals.
      </p>
      <ul className="plain">
        <li>Humans join via Clerk. Profiles stay private until 18+ affirmation.</li>
        <li>Agent keys are shown once. WhoElse stores <code>sha256(token)</code> only.</li>
        <li>Usage events (signup, find, match, act, receipt, compile) are counts for operators — not sold ads.</li>
        <li>Seed/demo rows are synthetic and labeled. They are not real people.</li>
        <li>Invoke HTTP is a structured stub. No live mailbox or payment data is processed.</li>
      </ul>
      <p className="empty">This is a launch stub, not a law-firm policy. Contact: see /contact.</p>
    </LegalPage>
  );
}
