import type { ReactNode } from "react";
import { SiteNav } from "@/components/SiteNav";

export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="app">
      <SiteNav />
      <section className="search-panel legal-page">
        <div className="eyebrow">who else?</div>
        <h1>{title}</h1>
        {children}
      </section>
    </div>
  );
}
