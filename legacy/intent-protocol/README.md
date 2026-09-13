# Intent protocol production v0.3 (archaeology)

**Prior art. Not ontology. Not the current WhoElse spec.**

This directory stores a compact index of the production intent-protocol catalog Tobias recited (August 2026 shape: **505** IDs, DATING folded into DATE). It exists so we can recover value, kill most of it, and keep building.

Do **not** import these IDs into `@whoelse/core`. Do **not** implement 505 slot schemas or vertical engines.

## Provenance

| Field | Value |
| --- | --- |
| Object | `intent-protocol.json` production v0.3 (machine file still not in any reachable GitHub repo) |
| How we have it | Tobias provided an **annotated recitation** of the production JSON as `n\|id\|label\|subgroup\|routing\|status\|deep\|slots` onelines |
| Slot fidelity | **Keys present.** Full enums incomplete except the five deep samples (DOCTOR, RESTAURANT, DATE, AIRBNB, LAWYER) |
| Raw dump | [`raw/`](raw/) — part files as delivered, unedited |
| Compact machine file | [`intent-protocol.production-v0.3.compact.json`](intent-protocol.production-v0.3.compact.json) |
| Parser | [`../../scripts/parse-intent-protocol-v03.py`](../../scripts/parse-intent-protocol-v03.py) |

This is **richer** than PR #5’s reconstructed 250-row snapshot (`legacy/artifacts/reconstructed-2026-09-12/`): real IDs (`i001-doctor`), 22 subgroups, routing (`geo-anchored` / `mixed` / `network-routed`), verification status, slot-key templates, and the DATE fold.

PR #5 versions stay separate. Do not reconcile 506 / 505 / 452+54 into one official number. v0.3 **is** the August 505 (DATING ⊂ DATE).

## Claimed catalog stats (full 505)

| Axis | Claim |
| --- | --- |
| Intents | 505 |
| Subgroups | 22 |
| Deep | 5 — DOCTOR (geo), RESTAURANT (mixed), DATE (mixed), AIRBNB, LAWYER |
| Routing | geo-anchored 235 · mixed 198 · network-routed 56 · missing 16 |
| Status | verified 248 · fragmented 128 · estimated 113 · untagged 16 |
| Duplicate labels | 53 |

Until all three recitation parts land, the compact JSON is a **partial** parse (`provenance.complete = false`). No invented rows.

## Reading

- [`../../docs/INTENT_GRAMMAR_V03_REVIEW.md`](../../docs/INTENT_GRAMMAR_V03_REVIEW.md) — what to keep / kill / map
- [`../../LEGACY_506_ANALYSIS.md`](../../LEGACY_506_ANALYSIS.md) — PR #5 operator collapse (still true)
- [`../../WHOELSE_DISCOVERIES.md`](../../WHOELSE_DISCOVERIES.md) — live engine lessons
