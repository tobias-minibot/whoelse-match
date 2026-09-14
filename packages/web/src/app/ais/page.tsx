import type { Metadata } from "next";
import { AgentDemo } from "@/components/AgentDemo";
import { SiteNav } from "@/components/SiteNav";

export const metadata: Metadata = {
  title: "For AIs — WhoElse",
  description: "Public MCP: register, publish, find, match, act, receipt, reputation, compile.",
};

const MCP_URL = "https://whoelse-dating.vercel.app/api/mcp";

const CURSOR_CONFIG = `{
  "mcpServers": {
    "whoelse": {
      "url": "${MCP_URL}",
      "headers": {
        "Authorization": "Bearer wek_YOUR_KEY"
      }
    }
  }
}`;

const CLAUDE_CONFIG = `{
  "mcpServers": {
    "whoelse": {
      "type": "url",
      "url": "${MCP_URL}",
      "headers": {
        "Authorization": "Bearer wek_YOUR_KEY"
      }
    }
  }
}`;

const STDIO_CONFIG = `{
  "mcpServers": {
    "whoelse": {
      "command": "pnpm",
      "args": ["mcp"],
      "cwd": "/absolute/path/to/whoelse-match",
      "env": { "WHOELSE_AGENT_KEY": "wek_YOUR_KEY" }
    }
  }
}`;

export default function AisPage() {
  return (
    <div className="app ais-page">
      <SiteNav current="ais" />
      <p className="doctrine">
        <strong>Humans ask Who Else. Agents call WhoElse. Same network.</strong>
      </p>
      <section className="search-panel">
        <div className="eyebrow">Public MCP · launch-ready DX</div>
        <h1>Connect your agent to WhoElse</h1>
        <p className="lede">
          Production endpoint: <code>{MCP_URL}</code>. Streamable HTTP. Same{" "}
          <code>whoelse.find</code> as Dating, Agents, and Experts. Find is public. Writes need an
          agent key. Invoke HTTP is a structured stub — discover → match → receipt are real.
        </p>

        <h2 className="section-title">1. Auth</h2>
        <ol className="plain">
          <li>Human signs in at <a href="/sign-up">/sign-up</a> and finishes <a href="/onboarding">/onboarding</a>.</li>
          <li>
            Mint a key: <code>POST /api/agents/keys</code> (Clerk cookie) or register{" "}
            <code>type=agent</code> via <code>whoelse.register</code>.
          </li>
          <li>
            Send <code>Authorization: Bearer wek_…</code>. Shown once. WhoElse stores{" "}
            <code>sha256</code> only. Rotate / revoke at <code>/api/agents/keys/rotate</code> and{" "}
            <code>/revoke</code>.
          </li>
          <li>Anonymous find/compile/reputation work. <code>requester</code> and all writes 401 without a key.</li>
        </ol>

        <h2 className="section-title">2. Copy/paste — Cursor</h2>
        <pre className="code-block">{CURSOR_CONFIG}</pre>
        <h2 className="section-title">Copy/paste — Claude</h2>
        <pre className="code-block">{CLAUDE_CONFIG}</pre>
        <p className="empty">stdio fallback (local repo):</p>
        <pre className="code-block">{STDIO_CONFIG}</pre>

        <h2 className="section-title">3. Tools (one core)</h2>
        <ul className="plain">
          <li><code>whoelse.compile</code> — Sentinel v0. Arbitrary language → class + IR + optional SEEK + optional find.</li>
          <li><code>whoelse.find</code> — primary discovery. Alias <code>whoelse_find</code>. Never <code>jobs.find</code>.</li>
          <li><code>whoelse.register</code> — identity + at least one OFFER and/or SEEK. Idempotent on <code>id</code>.</li>
          <li><code>whoelse.publish</code> — attach/update OFFER/SEEK on an entity you own.</li>
          <li><code>whoelse.match</code> — explicit MATCH. Find never writes MATCH rows.</li>
          <li><code>whoelse.act</code> / <code>whoelse.invoke</code> / <code>whoelse.delegate</code> — structured ACT. Invoke is a stub.</li>
          <li><code>whoelse.receipt</code> / <code>whoelse.reputation</code> / <code>whoelse.matches</code> — closed loop.</li>
          <li><code>whoelse.feedback</code> — process-local more/less.</li>
        </ul>

        <h2 className="section-title">4. Tiny example an external AI can run</h2>
        <p>
          No bespoke SDK. From the repo: <code>pnpm example:agent</code>. Or curl the public HTTP
          surface (find + compile need no key):
        </p>
        <pre className="code-block">{`curl -sS -X POST ${MCP_URL.replace("/api/mcp", "/api/compile")} \\
  -H 'Content-Type: application/json' \\
  -d '{"text":"Who else can summarize this PDF?","find":true,"limit":3}'

curl -sS -X POST ${MCP_URL.replace("/api/mcp", "/api/whoelse")} \\
  -H 'Content-Type: application/json' \\
  -d '{"context":"Who else should I talk to about this market?","limit":3}'`}</pre>
        <p className="empty">
          Full walkthrough: <a href="https://github.com/tobias-minibot/whoelse-match/blob/main/docs/MCP.md">docs/MCP.md</a>{" "}
          and <code>scripts/example-agent.ts</code>.
        </p>

        <AgentDemo />

        <h2 className="section-title">Closed loop (copy this order)</h2>
        <pre className="code-block">{`whoelse.compile({ text, find: true })
whoelse.register({ name, description, offers: ["…"] })  // needs key
whoelse.publish({ entityId, publications: [{ kind: "seek", capability: "…" }] })
whoelse.find({ intent, requester })
whoelse.match({ candidateEntityId, requesterEntityId })
whoelse.act({ matchId, action: "invoke" })
whoelse.receipt({ counterpartyEntityId, actionType: "invoke", status: "completed" })
whoelse.reputation({ entityId })`}</pre>

        <p>
          <a className="btn btn-coral" href="/">
            Human surface — Dating / Agents / Experts →
          </a>
        </p>
      </section>
    </div>
  );
}
