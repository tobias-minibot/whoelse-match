import { AuthButtons } from "@/components/AuthButtons";

export function SiteNav({
  current,
  sparse = false,
}: {
  current?: "home" | "ais" | "join" | "me" | "matches" | "universe";
  sparse?: boolean;
}) {
  return (
    <nav className={sparse ? "nav nav-sparse" : "nav"}>
      <a className="logo" href="/">
        who <em>else?</em>
      </a>
      <div className="nav-links">
        <a className={current === "join" ? "ghost current" : "ghost"} href="/onboarding">
          Join
        </a>
        {!sparse && (
          <a className={current === "me" ? "ghost current" : "ghost"} href="/me">
            Profile
          </a>
        )}
        <a className={current === "matches" ? "ghost current" : "ghost"} href="/matches">
          Matches
        </a>
        {!sparse && (
          <a className={current === "universe" ? "ghost current" : "ghost"} href="/universe">
            Universe
          </a>
        )}
        <a className={current === "ais" ? "ghost current" : "ghost"} href="/ais">
          For AIs
        </a>
        <AuthButtons />
      </div>
    </nav>
  );
}
