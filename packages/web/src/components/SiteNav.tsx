export function SiteNav({ current }: { current?: "home" | "ais" }) {
  return (
    <nav className="nav">
      <a className="logo" href="/">
        who <em>else?</em>
      </a>
      <div className="nav-links">
        <a className={current === "ais" ? "ghost current" : "ghost"} href="/ais">
          For AIs
        </a>
        <a className="ghost" href="/landing/index.html">
          Landing
        </a>
        <a className="ghost" href="/landing/index.html#story">
          Story
        </a>
      </div>
    </nav>
  );
}
