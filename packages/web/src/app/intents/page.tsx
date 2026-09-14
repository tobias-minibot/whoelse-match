import type { Metadata } from "next";
import { redirect } from "next/navigation";

type Search = Promise<{ q?: string }>;

export const metadata: Metadata = {
  title: "Intents — WhoElse",
  description: "Search the shared WhoElse dispatch vocabulary.",
};

export default async function IntentsPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const q = sp.q?.trim();
  redirect(q ? `/universe?q=${encodeURIComponent(q)}` : "/universe");
}
