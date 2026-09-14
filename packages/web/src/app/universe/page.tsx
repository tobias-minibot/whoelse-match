import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import universe from "@/data/universe-concepts.json";

export const metadata: Metadata = {
  title: "Universe — WhoElse",
  description: "505 historical intents vs the generic core. UI lenses are not coverage.",
};

const CLASS_COPY: Record<string, string> = {
  A: "Fully covered — ENTITY + OFFER/SEEK + constraints + MATCH",
  B: "Covered with normalization — alias / slot remap / Sentinel",
  C: "Needs one reusable extension — not a vertical engine",
  D: "Not yet representable",
  E: "Duplicate / obsolete — deprecate",
};

export default function UniversePage() {
  const { counts, effectiveCoverage, uiLenses, concepts } = universe;
  const groups = (["A", "B", "C", "D", "E"] as const).map((cls) => ({
    cls,
    rows: concepts.filter((c) => c.class === cls),
  }));

  return (
    <div className="app universe-page">
      <SiteNav current="universe" />
      <section className="search-panel">
        <div className="eyebrow">Coverage · not a 505 enum</div>
        <h1>Universe of representable intents</h1>
        <p className="lede">
          The public UI shows <strong>{uiLenses.length} lenses</strong> (
          {uiLenses.join(", ")}). The generic core already represents{" "}
          <strong>
            {effectiveCoverage.numerator} / {effectiveCoverage.denominator}
          </strong>{" "}
          historical intents ({effectiveCoverage.percent}%). Lenses are costumes. Coverage is
          ENTITY + OFFER/SEEK + MATCH.
        </p>
        <div className="universe-counts" aria-label="A through E counts">
          {groups.map(({ cls, rows }) => (
            <div key={cls} className={`universe-count class-${cls.toLowerCase()}`}>
              <span className="universe-letter">{cls}</span>
              <strong>{counts[cls]}</strong>
              <span>/ 505</span>
            </div>
          ))}
          <div className="universe-count class-effective">
            <span className="universe-letter">A+B</span>
            <strong>{effectiveCoverage.percent}%</strong>
            <span>effective</span>
          </div>
        </div>
        <p className="empty">
          Generated from the v0.3 compact cabinet (505 IDs). Recompute with{" "}
          <code>pnpm coverage:505</code>. Do not implement 505 apps.
        </p>
      </section>
      {groups.map(({ cls, rows }) => (
        <section key={cls} className="universe-group">
          <h2>
            {cls} · {rows.length} · {CLASS_COPY[cls]}
          </h2>
          <ul className="universe-list">
            {rows.map((row) => (
              <li key={row.id}>
                <code>{row.id}</code>
                <span>{row.label}</span>
                {row.extension ? <em>{row.extension}</em> : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
