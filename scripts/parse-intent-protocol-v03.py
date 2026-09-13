#!/usr/bin/env python3
"""Parse Tobias's annotated production v0.3 oneline dump into compact JSON.

Do not invent intents. Only rows present in legacy/intent-protocol/raw/.
"""

from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "legacy" / "intent-protocol" / "raw"
OUT = ROOT / "legacy" / "intent-protocol" / "intent-protocol.production-v0.3.compact.json"

LINE_RE = re.compile(
    r"^(?P<n>\d+)\|(?P<id>i\d{3}-[^|]+)\|(?P<label>[^|]+)\|(?P<subgroup>[^|]+)\|"
    r"(?P<routing>[^|]+)\|(?P<status>[^|]+)\|deep=(?P<deep>\d+)\|slots=(?P<slots>.*)$"
)


def parse_file(path: Path) -> list[dict]:
    rows: list[dict] = []
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        m = LINE_RE.match(line)
        if not m:
            raise SystemExit(f"unparseable line in {path.name}: {line}")
        slots = [s.strip() for s in m.group("slots").split(",") if s.strip()]
        rows.append(
            {
                "n": int(m.group("n")),
                "id": m.group("id"),
                "label": m.group("label"),
                "subgroup": m.group("subgroup"),
                "routing": m.group("routing"),
                "status": m.group("status"),
                "deep": int(m.group("deep")),
                "slots": slots,
            }
        )
    return rows


def main() -> None:
    parts = sorted(RAW.glob("part-*-intents-*.txt"))
    intents: list[dict] = []
    for part in parts:
        intents.extend(parse_file(part))

    ns = [r["n"] for r in intents]
    ids = [r["id"] for r in intents]
    if ns != list(range(1, len(ns) + 1)) and ns != sorted(set(ns)):
        # Allow incomplete corpus (awaiting later parts) as long as n is unique and ordered.
        if len(ns) != len(set(ns)):
            raise SystemExit(f"duplicate n values: {ns}")
        if ns != sorted(ns):
            raise SystemExit("rows are not in n order")
    if len(ids) != len(set(ids)):
        raise SystemExit("duplicate ids")

    labels = [r["label"] for r in intents]
    label_counts = Counter(labels)
    duplicate_labels = sorted([lab for lab, c in label_counts.items() if c > 1])
    extra_dup_rows = sum(c - 1 for c in label_counts.values() if c > 1)

    by_sub = Counter(r["subgroup"] for r in intents)
    by_routing = Counter(r["routing"] for r in intents)
    by_status = Counter(r["status"] for r in intents)
    deep_ids = [r["id"] for r in intents if r["deep"] >= 1]

    snapshot = {
        "schema": "intent-protocol.production-v0.3.compact",
        "version": "production-v0.3",
        "provenance": {
            "kind": "annotated-recitation",
            "source": (
                "Tobias provided an annotated recitation of the production intent-protocol JSON. "
                "Slot keys are present. Full enums are incomplete except deep samples noted."
            ),
            "framing": (
                "Prior art / corpus of attempted human intents — NOT ontology truth. "
                "NOT current spec. Do not blind-import."
            ),
            "reconcile_with": [
                "LEGACY_506_ANALYSIS.md",
                "legacy/artifacts/reconstructed-2026-09-12/surviving-catalog.json",
            ],
            "raw_parts": [p.name for p in parts],
            "complete": len(intents) == 505,
            "received": len(intents),
            "expected": 505,
        },
        "notes": {
            "slot_enums": "incomplete except deep samples (DOCTOR, RESTAURANT, DATE, AIRBNB, LAWYER)",
            "do_not": "implement 505 slot schemas or vertical engines",
        },
        "stats": {
            "received": len(intents),
            "expected": 505,
            "subgroups_seen": len(by_sub),
            "subgroups_claimed": 22,
            "deep_seen": deep_ids,
            "deep_claimed": [
                "i001-doctor",
                "i060-restaurant",
                "i308-date",
                "AIRBNB",
                "LAWYER",
            ],
            "by_subgroup": dict(by_sub),
            "by_routing": dict(by_routing),
            "by_status": dict(by_status),
            "duplicate_labels": duplicate_labels,
            "duplicate_label_extra_rows": extra_dup_rows,
            "claimed_routing": {
                "geo-anchored": 235,
                "mixed": 198,
                "network-routed": 56,
                "missing": 16,
            },
            "claimed_status": {
                "verified": 248,
                "fragmented": 128,
                "estimated": 113,
                "untagged": 16,
            },
            "claimed_duplicate_labels": 53,
        },
        "intents": intents,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(snapshot, indent=2) + "\n")
    print(f"wrote {OUT} intents={len(intents)} subgroups={len(by_sub)} deep={deep_ids}")
    print(f"routing={dict(by_routing)}")
    print(f"status={dict(by_status)}")
    print(f"duplicate_labels={duplicate_labels} extra_rows={extra_dup_rows}")


if __name__ == "__main__":
    main()
