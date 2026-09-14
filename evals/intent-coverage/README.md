# 505-intent coverage suite

Eval corpus only. **Not ontology. Not a runtime enum.**

Source of truth: [`legacy/intent-protocol/intent-protocol.production-v0.3.compact.json`](../../legacy/intent-protocol/intent-protocol.production-v0.3.compact.json) — **505** IDs (`i001–i325`, `i327–i506`; skip `i326`). 172 attested + 333 reconstructed-to-fill.

## Recompute

```bash
pnpm coverage:505
```

Rewrites `intents.json`, `summary.json`, and `packages/web/src/data/universe-concepts.json`.

Each row: canonical query, ≥3 NL paraphrases, expected IR stub, A–E status, plus a local `whoelse.compile` snapshot (heuristics only).

```bash
pnpm coverage:505:test
pnpm coverage:505:probe   # optional; polite sample of production /api/compile
```

`pnpm test` also runs `coverage:505:test` so the 505 denominator cannot silently drift.

## Classes

| Class | Meaning |
| --- | --- |
| **A** | Generic core already represents the useful request (ENTITY + OFFER/SEEK + constraints + MATCH). |
| **B** | Same engine; needs alias / slot remap / Sentinel compilation. No new primitive. |
| **C** | Same op; missing one reusable concept (eligibility, reservation, inventory, geo-radius). |
| **D** | Model cannot express cleanly. |
| **E** | Duplicate / obsolete catalog row. Deprecate. Do not distort architecture. |

**Effective coverage = A+B / 505.** UI showing Dating / Agents / Experts is a costume count, not this number.

See [`docs/INTENT_COVERAGE_505.md`](../../docs/INTENT_COVERAGE_505.md).
