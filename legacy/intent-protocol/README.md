# Intent protocol production v0.3 (archaeology)

**Prior art. Not ontology. Not the current WhoElse spec.**

Compact index of the production intent-protocol catalog (August 2026 shape: **505** IDs, DATING folded into DATE). Stored so we can recover value, kill most of it, and keep building.

Do **not** import these IDs into `@whoelse/core`. Do **not** implement 505 slot schemas or vertical engines.

## Provenance

| Field | Value |
| --- | --- |
| Object | `intent-protocol.production-v0.3.json` (machine file still not in any reachable GitHub repo) |
| How we have it | Tobias archaeology attachment = **annotated recitation**. Slot keys present. Full enums live in that attachment and are **not** blindly imported |
| Attested rows | `n=1–170` from [`raw/part-1-intents-1-170.txt`](raw/part-1-intents-1-170.txt); plus `i308-date` and `i400-ai-tools` from the recitation |
| Fill rows | `reconstructed-to-fill` from the 22 subgroup counts + PR #5 reconstructed catalog names (launch dump was truncated) |
| SOCIAL hole | Source skips **`i326`** (325→327). Compact count still 505 (`i001–i325`, `i327–i506`). Hypothesis: `i326` was DATING, retired in the DATE fold |
| Compact file | [`intent-protocol.production-v0.3.compact.json`](intent-protocol.production-v0.3.compact.json) |
| Builder | [`../../scripts/build-intent-protocol-v03.py`](../../scripts/build-intent-protocol-v03.py) |

This is **richer** than PR #5’s reconstructed 250-row snapshot: real IDs, 22 subgroups, routing, verification status, slot-key templates, DATE fold.

PR #5 versions stay separate. Do not reconcile 506 / 505 / 452+54 into one official number. v0.3 **is** the August 505 (DATING ⊂ DATE).

## Catalog stats (locked on this compact file)

| Axis | Claimed | Compact file |
| --- | --- | --- |
| Intents | 505 | 505 |
| Subgroups | 22 | 22 |
| Deep | DOCTOR, RESTAURANT, DATE, AIRBNB, LAWYER | `i001-doctor`, `i060-restaurant`, `i308-date`, `i353-airbnb`, `i385-lawyer` |
| Routing | geo 235 · mixed 198 · network 56 · missing 16 | **exact** |
| Status | verified 248 · fragmented 128 · estimated 113 · untagged 16 | **exact** (fill-row rebalance only) |
| Duplicate-label extra rows | 53 | 53 (52 distinct labels; one label appears 3×) |

**AIRBNB and LAWYER IDs are fill** (deep flag + slot keys reconstructed from the briefing; enums still incomplete). DATE and AI TOOLS IDs are attested.

## Reading

- [`../../docs/INTENT_GRAMMAR_V03_REVIEW.md`](../../docs/INTENT_GRAMMAR_V03_REVIEW.md) — keep / kill / map
- [`onebox-alias-hints.json`](onebox-alias-hints.json) — optional thin synonyms (DATE/dating/romance, …)
- [`../../LEGACY_506_ANALYSIS.md`](../../LEGACY_506_ANALYSIS.md) — PR #5 operator collapse (still true)
- [`../../WHOELSE_DISCOVERIES.md`](../../WHOELSE_DISCOVERIES.md) — live engine lessons
