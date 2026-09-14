"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UNIVERSE_CONCEPTS, conceptToSearchable, type UniverseConcept } from "@/lib/intent-catalog";
import { intentQuestion, searchIntents } from "@whoelse/core/vocab-search";

const CLASS_COPY: Record<string, string> = {
  A: "Fully covered — ENTITY + OFFER/SEEK + constraints + MATCH",
  B: "Covered with normalization — alias / slot remap / Sentinel",
  C: "Needs one reusable extension — not a vertical engine",
  D: "Not yet representable",
  E: "Duplicate / obsolete — deprecate",
};

export function UniverseBrowser({
  counts,
  effectiveCoverage,
  uiLenses,
}: {
  counts: Record<string, number>;
  effectiveCoverage: { numerator: number; denominator: number; percent: number };
  uiLenses: string[];
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initial = searchParams.get("q") ?? "";
  const [draft, setDraft] = useState(initial);
  const urlTimer = useRef<number>(0);

  const pushQuery = useCallback(
    (value: string) => {
      window.clearTimeout(urlTimer.current);
      urlTimer.current = window.setTimeout(() => {
        const q = value.trim();
        const path = q ? `/universe?q=${encodeURIComponent(q)}` : "/universe";
        router.replace(path, { scroll: false });
      }, 180);
    },
    [router],
  );

  const filteredIds = useMemo(() => {
    const q = draft.trim();
    if (!q) return null;
    const catalog = UNIVERSE_CONCEPTS.map(conceptToSearchable);
    const hits = searchIntents(catalog, q, { minLength: 1, limit: 505 });
    return new Set(hits.map((h) => h.id));
  }, [draft]);

  const groups = (["A", "B", "C", "D", "E"] as const).map((cls) => ({
    cls,
    rows: UNIVERSE_CONCEPTS.filter((c) => {
      if (c.class !== cls) return false;
      if (!filteredIds) return true;
      return filteredIds.has(c.id);
    }),
  }));

  const shown = groups.reduce((n, g) => n + g.rows.length, 0);

  return (
    <>
      <section className="search-panel">
        <div className="eyebrow">Coverage · not a 505 enum</div>
        <h1>Universe of representable intents</h1>
        <p className="lede">
          The public UI shows <strong>{uiLenses.length} lenses</strong> ({uiLenses.join(", ")}). The
          generic core already represents{" "}
          <strong>
            {effectiveCoverage.numerator} / {effectiveCoverage.denominator}
          </strong>{" "}
          historical intents ({effectiveCoverage.percent}%). Lenses are costumes. Coverage is ENTITY +
          OFFER/SEEK + MATCH.
        </p>
        <div className="universe-search">
          <label className="sr-only" htmlFor="universe-q">
            Filter intents
          </label>
          <input
            id="universe-q"
            type="search"
            value={draft}
            placeholder="Search labels, questions, categories, class…"
            autoComplete="off"
            onChange={(e) => {
              const value = e.target.value;
              setDraft(value);
              pushQuery(value);
            }}
            aria-label="Filter intents"
          />
          <p className="empty">
            {draft.trim()
              ? `${shown} match${shown === 1 ? "" : "es"} for “${draft.trim()}”`
              : "Type tennis, visa, kindergarten, pdf — or a coverage class A–E."}{" "}
            <a href="/">Try in Who else?</a>
          </p>
        </div>
        <div className="universe-counts" aria-label="A through E counts">
          {groups.map(({ cls, rows }) => (
            <button
              key={cls}
              type="button"
              className={`universe-count class-${cls.toLowerCase()}${draft.trim().toUpperCase() === cls ? " active" : ""}`}
              onClick={() => {
                const next = draft.trim().toUpperCase() === cls ? "" : cls;
                setDraft(next);
                pushQuery(next);
              }}
            >
              <span className="universe-letter">{cls}</span>
              <strong>{filteredIds ? rows.length : counts[cls]}</strong>
              <span>/ 505</span>
            </button>
          ))}
          <div className="universe-count class-effective">
            <span className="universe-letter">A+B</span>
            <strong>{effectiveCoverage.percent}%</strong>
            <span>effective</span>
          </div>
        </div>
        <p className="empty">
          Generated from the v0.3 compact cabinet (505 IDs). Recompute with <code>pnpm coverage:505</code>.
          Do not implement 505 apps.
        </p>
      </section>
      {groups.map(({ cls, rows }) =>
        rows.length === 0 ? null : (
          <section key={cls} className="universe-group">
            <h2>
              {cls} · {rows.length} · {CLASS_COPY[cls]}
            </h2>
            <ul className="universe-list">
              {rows.map((row) => (
                <UniverseRow key={row.id} row={row} />
              ))}
            </ul>
          </section>
        ),
      )}
      {draft.trim() && shown === 0 ? <p className="empty">No intents match that filter.</p> : null}
    </>
  );
}

function UniverseRow({ row }: { row: UniverseConcept }) {
  const question = intentQuestion(conceptToSearchable(row));
  const href = `/?q=${encodeURIComponent(question)}`;
  return (
    <li>
      <code>{row.id}</code>
      <a href={href}>{row.label}</a>
      <span className="universe-q">{question}</span>
      <em>{row.subgroup}</em>
      {row.extension ? <em>{row.extension}</em> : null}
    </li>
  );
}
