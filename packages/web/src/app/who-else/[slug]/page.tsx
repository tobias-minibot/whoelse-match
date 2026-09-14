import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { amazeBySlug } from "@whoelse/core/amaze";
import { DiscoverApp } from "@/components/DiscoverApp";
import { whoElseShareMetadata } from "@/lib/share-meta";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const featured = amazeBySlug(slug);
  if (!featured) return whoElseShareMetadata("Who else?");
  return whoElseShareMetadata(featured.query);
}

export default async function WhoElseSlugPage({ params }: { params: Params }) {
  const { slug } = await params;
  if (!amazeBySlug(slug)) notFound();
  return (
    <Suspense>
      <DiscoverApp />
    </Suspense>
  );
}
