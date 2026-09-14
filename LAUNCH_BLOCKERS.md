# LAUNCH_BLOCKERS

Shortest credible path to “whoelse.ai / whoelse-dating.vercel.app is live.”

## BLOCKER

1. **This pack on production.** After merge: `GET /api/health` lists `whoelse.compile`. `/privacy`, `/terms`, `/contact` return 200. `/` shows **Dating · Agents · Experts** first. `/ais` has copy/paste MCP config. `POST /api/compile` classifies the locked examples without OpenAI.
2. **Clerk production origin.** The existing Clerk app must allow `whoelse-dating.vercel.app` (and later whoelse.ai). If hosted sign-in 404s, humans cannot join. Do not mint a second Clerk project.
3. **Invite copy must be true.** Production `WHOELSE_SEED` stays unset. The live pool is empty until real humans publish. When live find has no useful matches, Who else? falls back to a **labeled Playground** (in-memory demo seed — never written to Neon, never presented as live people). Seed cards stay labeled synthetic/AI. **Invoke HTTP is a stub** (structured “I would do X”). Receipts and reputation persist; live execution does not.
4. **Abuse floor is thin.** 18+ affirmation, write rate limits, HUMAN/AI badges, and `/contact` exist. There is **no report/block queue**. Do not market this as a scaled dating product. A small invite of people who know that is fine.

If those four hold, open the invite. The core loop is closed. Three lenses share it. Public MCP works. Sentinel is callable. Legal stubs exist. Analytics are real counts, not vanity.

## AFTER LAUNCH

- whoelse.ai custom-domain DNS (not owned in this repo)
- Report / block / moderation queue
- Live invoke webhooks (keep the stub until then)
- Full chat, notifications inbox, payments
- Factory costumes as a marketing surface (Apt, Jobs, … stay under More)
- APM, email, vanity dashboards
- Perfection checklist
