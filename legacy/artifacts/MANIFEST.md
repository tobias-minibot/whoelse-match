# Legacy artifact MANIFEST

Copied into `whoelse-match` on **2026-09-12** by the cloud-agent archaeology run.  
Originals were **not** edited in place. This tree is evidence, not production.

## Hunt outcome (machine files)

| Sought | Result |
| --- | --- |
| `intent-slots-506.csv` | **Not found** on any reachable GitHub repo |
| `intent-protocol.json` | **Not found** |
| July 18 2026 506-intent snapshot (incl. DATING) | **Not found** as a file. Count is a *claimed* version, recorded separately |
| August 15 2026 snapshot (505; DATING ⊂ DATE) | **Not found** as a file. Count is a *claimed* version, recorded separately |
| MCP4MCP imported taxonomy | **Not found**. `tobias-minibot/4mcp` and `mcp4mcp` 404 |
| WhoElse Protocol v2 (452 canonical, 506 IDs, 54 aliases, 36 slot roles) | **Not found** as a machine file. Counts recorded as a *claimed* version |

**Do not silently reconcile 506 vs 505 vs 452+54.** They are three different version records. Arithmetic note only: 452 + 54 = 506 IDs *if* Protocol v2 is taken at face value. August 15’s 505 is a later fold (DATING → DATE), not the same object as “452 + aliases.”

### Repos probed (GitHub token = `cursor`, not Tobias’s private account)

Reachable public `tobias-minibot` repos cloned on this VM:

- `whoelse-match` (this repo)
- `WhoElseExpressions`
- `whoelse-meaning-app`
- `who-else-startups`
- `voice-relay-search`
- `pricemcp`
- `quotecall`
- `intelligent-artificialness-motion-reel`
- `news-from-now-on`

Named in the brief but **404** under `tobias-minibot/` for this token:

`whoelse`, `who-else-engine`, `who-else-index`, `who-else-analyzer`, `whoelse-search`, `whoelse-collateral`, `whoelse-xprize`, `4mcp`, `knowledge-compendium`, `whoelse-live-search`, `whoelse-translator`, `whoelse-autonomous-org`, `intent-namespace`, `mcp4mcp`, `MCP4MCP`, plus several `whoelse-*` / `intent-*` aliases.

Private-repo list for `tobias-minibot` was empty for this token. `whoelseai` GitHub user has 0 public repos. DIN SPEC GitHub marked “coming soon” on whoelse.ai/din (still absent).

Raw command log: [`github-hunt/HUNT_LOG.txt`](github-hunt/HUNT_LOG.txt)

---

## Copied / fetched artifacts

SHA-256 computed on 2026-09-12 after copy. Do not modify these files in place.

| Path | SHA-256 | Bytes | Source URL | Date |
| --- | --- | ---: | --- | --- |
| `WhoElseExpressions/who_else_languages.json` | `24d5af15888ff51e46689740df0b3cfdc6891cf662b2279abea8c5460b2c9beb` | 12244 | https://github.com/tobias-minibot/WhoElseExpressions | clone 2026-09-12 (upstream repo date 2026-04-16) |
| `who-else-startups/8-protocol-universal-namespace-pitch.md` | `0eee3c26684a15b69ce2e776210a7ac9a8d6d1917648500f4b66d16c55db0abd` | 19299 | https://github.com/tobias-minibot/who-else-startups | clone 2026-09-12 |
| `who-else-startups/2-intent-matching-pitch.md` | `0c4df9024c88b2324ee4daa3537804051a4729a7d04078b24f7529d9bda1435e` | 12576 | https://github.com/tobias-minibot/who-else-startups | clone 2026-09-12 |
| `whoelse-meaning-app/product-concept.md` | `ae0801bcddd14c8a53b4dcb9789f80be390750fb6fe215dad39d499a89cbccf8` | 4992 | https://github.com/tobias-minibot/whoelse-meaning-app | clone 2026-09-12 |
| `whoelse-match-landing/index.html` | `0069f8a1b9dba1fdc89cb5600968d0fef05ac2e2e94b0d824c19571a26c2192a` | 18057 | this repo `landing/index.html` @ main | copy 2026-09-12 |
| `whoelse.ai/home.extract.md` | `53a3d019268b8c8b13f81ee2d6070085b7268eda49a246908d1793ac4c6183f2` | 966 | https://www.whoelse.ai/ | fetch 2026-09-12 |
| `whoelse.ai/idea.extract.md` | `12e24704309149deee01f9d25d286570d22b38c96d38b2eb7fe1d30e66c58504` | 1274 | https://www.whoelse.ai/idea | fetch 2026-09-12 |
| `whoelse.ai/din.extract.md` | `8e3f523f43b66c1f8ff5f77d7e461e0802a3922e7d44a9d4a693f8b2fa851070` | 703 | https://www.whoelse.ai/din | fetch 2026-09-12 |
| `din-spec-2343/parameters.extract.md` | `0d51e3323fd4322ffa21468b3ff91c60130b15e35db30bbf599a3524cf3500f1` | 1284 | DIN press + secondary SPEC table | 2020 / fetch 2026-09-12 |
| `reconstructed-2026-09-12/surviving-catalog.json` | `034d882ac1ee258cc1b061e519b4f6a59d978cb7b8d7043bdd4892b1bf9dea76` | 190498 | **PROVENANCE: user-pasted surviving catalog 2026-09-12** | 2026-09-12 |
| `github-hunt/HUNT_LOG.txt` | `6da9aa191466bf18cb09b8d3ac52a27a8757295b7874381e08a3707e31d1b8bf` | 4689 | `gh` on this VM | 2026-09-12 |

Webflow HTML dumps of whoelse.ai were fetched then discarded (700KB–800KB of chrome). Text extracts preserve the claims.

---

## Version ledger (do not merge)

| Version | Claimed count | What changed | File recovered? |
| --- | ---: | --- | --- |
| Public site 2018–2022 | **200** (Medium 2019 also said **150**) | Early “most common intents” marketing | No catalog file; page extracts only |
| July 18 2026 | **506** | Includes **DATING** as its own ID next to **DATE** | No |
| August 15 2026 | **505** | **DATING** folded into **DATE** | No |
| Protocol v2 | **452** canonical concepts, **506** IDs, **54** permanent aliases, **36** global slot roles | IDs = concepts + aliases *if* 452+54=506 | No |

Reconstructed snapshot in this PR: **250** intents (7 named + 17 public-evidenced + 204 category expansions + 22 AI/agent misses). Labeled reconstructed. Not a silent stand-in for 506.
