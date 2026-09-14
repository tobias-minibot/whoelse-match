import { AuthButtons } from "@/components/AuthButtons";

export function SiteNav({
  current,
}: {
  current?: "home" | "ais" | "join" | "me" | "matches" | "universe";
}) {
  return (
    <nav className="nav">
      <a className="logo" href="/">
        who <em>else?</em>
      </a>
      <div className="nav-links">
        <a className={current === "join" ? "ghost current" : "ghost"} href="/onboarding">
          Join
        </a>
        <a className={current === "me" ? "ghost current" : "ghost"} href="/me">
          Profile
        </a>
        <a className={current === "matches" ? "ghost current" : "ghost"} href="/matches">
          Matches
        </a>
        <a className={current === "universe" ? "ghost current" : "ghost"} href="/universe">
          Universe
        </a>
        <a className={current === "ais" ? "ghost current" : "ghost"} href="/ais">
          For AIs
        </a>
        <a className="ghost" href="/landing/index.html">
          Landing
        </a>
        <a className="ghost" href="/landing/index.html#story">
          Story
        </a>
        <AuthButtons />
      </div>
    </nav>
  );
}
