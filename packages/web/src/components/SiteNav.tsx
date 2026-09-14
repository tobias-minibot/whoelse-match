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
      <a className="logo" href="/" aria-current={current === "home" ? "page" : undefined}>
        who <em>else?</em>
      </a>
      <div className="nav-links">
        <a
          className={current === "join" ? "ghost current" : "ghost"}
          href="/onboarding"
          aria-current={current === "join" ? "page" : undefined}
        >
          Join
        </a>
        {!sparse && (
          <a
            className={current === "me" ? "ghost current" : "ghost"}
            href="/me"
            aria-current={current === "me" ? "page" : undefined}
          >
            Profile
          </a>
        )}
        <a
          className={current === "matches" ? "ghost current" : "ghost"}
          href="/matches"
          aria-current={current === "matches" ? "page" : undefined}
        >
          Matches
        </a>
        <a
          className={current === "universe" ? "ghost current" : "ghost"}
          href="/universe"
          aria-current={current === "universe" ? "page" : undefined}
        >
          Universe
        </a>
        <a
          className={current === "ais" ? "ghost current" : "ghost"}
          href="/ais"
          aria-current={current === "ais" ? "page" : undefined}
        >
          For AIs
        </a>
        <AuthButtons />
      </div>
    </nav>
  );
}
