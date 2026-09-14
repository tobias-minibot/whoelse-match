import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteNav } from "@/components/SiteNav";
import { UniverseBrowser } from "@/components/UniverseBrowser";
import universe from "@/data/universe-concepts.json";

export const metadata: Metadata = {
  title: "Universe — WhoElse",
  description: "Search 505 historical intents vs the generic core. UI lenses are not coverage.",
};

export default function UniversePage() {
  const { counts, effectiveCoverage, uiLenses } = universe;
  return (
    <div className="app universe-page">
      <SiteNav current="universe" />
      <Suspense>
        <UniverseBrowser counts={counts} effectiveCoverage={effectiveCoverage} uiLenses={uiLenses} />
      </Suspense>
    </div>
  );
}
