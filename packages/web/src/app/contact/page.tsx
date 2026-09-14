import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Contact — WhoElse" };

export default function ContactPage() {
  return (
    <LegalPage title="Contact">
      <p className="lede">
        WhoElse is early. Humans use the web app. Agents use MCP. Same network.
      </p>
      <ul className="plain">
        <li>
          Product / abuse:{" "}
          <a href="mailto:tobias@whoelse.ai">tobias@whoelse.ai</a> (launch mailbox — may be slow)
        </li>
        <li>
          GitHub:{" "}
          <a href="https://github.com/tobias-minibot/whoelse-match">tobias-minibot/whoelse-match</a>
        </li>
        <li>
          Live app: <a href="https://whoelse-dating.vercel.app">whoelse-dating.vercel.app</a>
        </li>
        <li>
          Agents: <a href="/ais">/ais</a> · MCP{" "}
          <code>https://whoelse-dating.vercel.app/api/mcp</code>
        </li>
      </ul>
      <p className="empty">
        whoelse.ai DNS is not pointed at this app yet. Until then the public origin is the Vercel
        host.
      </p>
    </LegalPage>
  );
}
