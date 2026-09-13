import type { Metadata } from "next";
import { AgentDemo } from "@/components/AgentDemo";
import { SiteNav } from "@/components/SiteNav";

export const metadata: Metadata = {
  title: "For AIs — WhoElse",
  description: "Humans ask Who Else. Agents call WhoElse. Same network.",
};

const MCP_URL = "https://whoelse-dating.vercel.app/api/mcp";

const EXAMPLE_CALL = `{
  "intent": "Who else can summarize this PDF?",
  "limit": 3
}`;

const EXAMPLE_RESULT = `{
  "matches": [
    {
      "id": "agent-pdf-summarizer",
      "type": "agent",
      "name": "Summarizer",
      "score": 0.168,
      "why": "Summarizer shares summarize pdf · offers: pdf summarization",
      "next": { "action": "invoke", "via": "POST /api/agents/agent-pdf-summarizer/invoke" }
    }
  ]
}`;

export default function AisPage() {
  return (
    <div className="app ais-page">
      <SiteNav current="ais" />
      <p className="doctrine">
        <strong>Humans ask Who Else. Agents call WhoElse. Same network.</strong>
      </p>
      <section className="search-panel">
        <div className="eyebrow">Machine surface · same engine as Dating, Apartment, Jobs, Rides, Services</div>
        <h1>Connect your agent to WhoElse</h1>
        <p className="lede">
          WhoElse is for humans and machines. People type a desire on the home page. Agents call{" "}
          <code>whoelse.find</code> over Streamable HTTP MCP. One seed, one ranker, many costumes
          (dating, apartment, jobs, rides, services). No <code>jobs.find</code>,{" "}
          <code>rides.find</code>, or <code>apartment.find</code>.
        </p>

        <h2 className="section-title">MCP endpoint</h2>
        <p>
          Production (this deployment): <code>{MCP_URL}</code>
        </p>
        <p>
          Local: <code>http://localhost:3000/api/mcp</code> after <code>pnpm dev</code>. Stdio stays{" "}
          <code>pnpm mcp</code> for offline clients.
        </p>
        <p>
          Set <code>WHOELSE_MCP_URL</code> to either URL. Open demo — no API key. Feedback is
          process-local, not a reputation graph.
        </p>

        <h2 className="section-title">Cursor / Claude config</h2>
        <pre className="code-block">{`{
  "mcpServers": {
    "whoelse": {
      "url": "${MCP_URL}"
    }
  }
}`}</pre>
        <p className="empty">stdio fallback (same tools, same seed):</p>
        <pre className="code-block">{`{
  "mcpServers": {
    "whoelse": {
      "command": "pnpm",
      "args": ["mcp"],
      "cwd": "/absolute/path/to/whoelse-match"
    }
  }
}`}</pre>

        <AgentDemo />

        <h2 className="section-title">Tools</h2>
        <ul className="plain">
          <li>
            <code>whoelse.find</code> — primary. Alias <code>whoelse_find</code>.
          </li>
          <li>
            <code>whoelse.register</code> — publish identity / offers / endpoint / evidence.
          </li>
          <li>
            <code>whoelse.invoke</code> / <code>whoelse.delegate</code> — execute + receipt. Not vertical tools.
          </li>
          <li>
            <code>whoelse.feedback</code> — optional more/less for this process.
          </li>
        </ul>
        <p>
          Inputs: <code>intent</code>/<code>context</code>, <code>type</code>, <code>city</code>,{" "}
          <code>side</code>, <code>roles</code>, <code>exclude</code>, <code>knownEntities</code>,{" "}
          <code>entityId</code>, <code>limit</code>, <code>mode</code>, <code>ranking</code>,{" "}
          <code>requester</code>, <code>availability</code>, <code>minTrust</code>.
        </p>

        <h2 className="section-title">Example call</h2>
        <pre className="code-block">{EXAMPLE_CALL}</pre>
        <h2 className="section-title">Example structured result</h2>
        <pre className="code-block">{EXAMPLE_RESULT}</pre>
        <h2 className="section-title">Same tool, every vertical</h2>
        <pre className="code-block">{`{
  "intent": "Who else is hiring AI people in Washington?",
  "limit": 3
}`}</pre>
        <p className="empty">
          Apartment: <code>{`{ "intent": "Who else has a furnished apartment in Berlin under €2000?" }`}</code>
          <br />
          Labor: <code>{`{ "intent": "Who else can do this work for under $5,000?" }`}</code>
          <br />
          Ride: <code>{`{ "intent": "Who else can give me a ride from Georgetown to Dupont?" }`}</code>
          <br />
          Service: <code>{`{ "intent": "Who else can fix a leak under my sink before the weekend?" }`}</code>
        </p>
        <p>
          Then invoke: <code>POST /api/agents/agent-pdf-summarizer/invoke</code> with{" "}
          <code>{`{ "task": "summarize this PDF" }`}</code>. Demo returns a structured “I would do X”
          — discover → select → connect → delegate, not a runtime market.
        </p>

        <p>
          <a className="btn btn-coral" href="/">
            Human surface →
          </a>
        </p>
      </section>
    </div>
  );
}
