import { findPreferLive } from "@whoelse/core";
import type { Metadata } from "next";
import { getNetwork } from "@/lib/engine";

export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/$/, "")}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  return "https://whoelse-dating.vercel.app";
}

export async function whoElseShareMetadata(query: string): Promise<Metadata> {
  const q = query.trim() || "Who else?";
  let description = "Ask who else. Humans type it. Agents call whoelse.find.";
  let playground = false;
  try {
    const network = await getNetwork();
    const pooled = await findPreferLive(network, { context: q, limit: 4 });
    playground = pooled.pool === "playground";
    const names = pooled.result.candidates.slice(0, 3).map((c) => c.entity.name);
    if (names.length) {
      const more = pooled.result.candidates.length > 3 ? " · and more" : "";
      const where = playground ? "Playground preview — not the live network yet" : "on WhoElse";
      description = `${names.join(" · ")}${more}. ${where}.`;
    }
  } catch {
    // OG still ships the question even if find is cold.
  }
  const title = q.length > 70 ? `${q.slice(0, 67)}…` : q;
  const og = `${siteUrl()}/og?q=${encodeURIComponent(q)}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${siteUrl()}/q?q=${encodeURIComponent(q)}`,
      siteName: "who else?",
      type: "website",
      images: [{ url: og, width: 1200, height: 630, alt: q }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [og],
    },
  };
}
