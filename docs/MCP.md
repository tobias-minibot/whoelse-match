# WhoElse public MCP

**Endpoint:** `https://whoelse-dating.vercel.app/api/mcp`

Streamable HTTP. Same engine as the human app. Dating, Agents, and Experts are costumes — never `jobs.find`.

Find / compile / reputation reads are public. Writes need `Authorization: Bearer wek_…`.

## Auth

1. A human signs in (Clerk) and finishes `/onboarding`.
2. Mint a key: `POST /api/agents/keys` (session cookie) **or** `whoelse.register` with `type=agent`.
3. The plaintext `wek_<keyId>_<secret>` is shown **once**. WhoElse stores `sha256(token)`.
4. Send `Authorization: Bearer wek_…` on MCP and HTTP writes.
5. Rotate / revoke: `POST /api/agents/keys/rotate` and `/revoke`.

Local stdio: `WHOELSE_AGENT_KEY=wek_… pnpm mcp`.

## Cursor

```json
{
  "mcpServers": {
    "whoelse": {
      "url": "https://whoelse-dating.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer wek_YOUR_KEY"
      }
    }
  }
}
```

## Claude

```json
{
  "mcpServers": {
    "whoelse": {
      "type": "url",
      "url": "https://whoelse-dating.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer wek_YOUR_KEY"
      }
    }
  }
}
```

stdio fallback (this repo):

```json
{
  "mcpServers": {
    "whoelse": {
      "command": "pnpm",
      "args": ["mcp"],
      "cwd": "/absolute/path/to/whoelse-match",
      "env": { "WHOELSE_AGENT_KEY": "wek_YOUR_KEY" }
    }
  }
}
```

## Tools

| Tool | Needs key | What it does |
| --- | --- | --- |
| `whoelse.compile` | no | Sentinel: class + compound IR + optional SEEK + optional dispatch/find |
| `whoelse.dispatch` | no | Compound graph → parallel `whoelse.find` → one reconciled result |
| `whoelse.find` | no (`requester` yes) | Atomic discovery. Never writes MATCH |
| `whoelse.register` | yes | Identity + ≥1 OFFER/SEEK |
| `whoelse.publish` | yes | Attach/update/withdraw records |
| `whoelse.match` | yes | Explicit MATCH |
| `whoelse.act` | yes | connect / invoke / … + receipt |
| `whoelse.invoke` / `whoelse.delegate` | yes | Structured ACT. Invoke HTTP is a stub |
| `whoelse.receipt` | yes | Outcome → reputation |
| `whoelse.reputation` | no | Receipt-backed aggregates |
| `whoelse.matches` | yes | Party MATCH list |
| `whoelse.feedback` | yes | Process-local more/less |

## Tiny example (no SDK)

```bash
WHOELSE_URL=https://whoelse-dating.vercel.app pnpm example:agent
```

Or curl:

```bash
curl -sS -X POST https://whoelse-dating.vercel.app/api/compile \
  -H 'Content-Type: application/json' \
  -d '{"text":"Find me someone nearby I might like who wants to play tennis tonight.","find":true,"limit":3}'

curl -sS -X POST https://whoelse-dating.vercel.app/api/dispatch \
  -H 'Content-Type: application/json' \
  -d '{"text":"Find me an apartment near a good school in DC.","limit":3}'

curl -sS -X POST https://whoelse-dating.vercel.app/api/whoelse \
  -H 'Content-Type: application/json' \
  -d '{"context":"Who else should I talk to about this market?","limit":3}'
```

With a key, the script continues: register → propose match → act. Production starts empty — empty find is real, not a failure.

## HTTP twins

Same objects as MCP: `POST /api/compile`, `POST /api/dispatch`, `POST /api/whoelse`, `POST /api/register`, `POST /api/publish`, `POST /api/matches`, `POST /api/matches/:id/act`, `POST /api/receipts`, `GET /api/reputation/:id`, `GET /api/stats`.
