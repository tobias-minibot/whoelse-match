import { Suspense } from "react";
import type { Metadata } from "next";
import { DiscoverApp } from "@/components/DiscoverApp";
import { whoElseShareMetadata } from "@/lib/share-meta";

type Search = Promise<{ q?: string; query?: string; like?: string; as?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: Search }): Promise<Metadata> {
  const sp = await searchParams;
  return whoElseShareMetadata(String(sp.q ?? sp.query ?? "Who else?"));
}

export default function QueryPage() {
  return (
    <Suspense>
      <DiscoverApp />
    </Suspense>
  );
}
