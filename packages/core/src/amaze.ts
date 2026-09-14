/**
 * First-ten-seconds prompts. Range without looking like a schema catalog.
 * Each sentence is already representable on the existing seed / whoelse.find.
 */
export type AmazePrompt = {
  slug: string;
  label: string;
  query: string;
};

export const AMAZE_PROMPTS: AmazePrompt[] = [
  {
    slug: "meet-tonight",
    label: "Meet tonight",
    query: "Who else wants to meet tonight in DC?",
  },
  {
    slug: "fix-this",
    label: "Fix this",
    query: "Who else can fix a leak under my sink before the weekend?",
  },
  {
    slug: "apartment",
    label: "Apartment",
    query: "Who else has a 1-bedroom in DC under $2,500?",
  },
  {
    slug: "build-with",
    label: "Build with",
    query: "Who else wants to build a network of voice assistants?",
  },
  {
    slug: "cheaper",
    label: "Cheaper",
    query: "Who else has a cheaper equivalent 18V drill?",
  },
  {
    slug: "agent-fallback",
    label: "If that agent fails",
    query: "Who else can take over if the primary agent fails?",
  },
];

export function amazeBySlug(slug: string): AmazePrompt | undefined {
  const key = slug.trim().toLowerCase();
  return AMAZE_PROMPTS.find((p) => p.slug === key);
}

export function amazeByQuery(query: string): AmazePrompt | undefined {
  const needle = query.trim().toLowerCase();
  return AMAZE_PROMPTS.find((p) => p.query.toLowerCase() === needle);
}

export function sharePath(query: string, opts: { entityId?: string; costume?: string } = {}): string {
  const featured = !opts.entityId && !opts.costume ? amazeByQuery(query) : undefined;
  if (featured) return `/who-else/${featured.slug}`;
  const params = new URLSearchParams();
  const q = query.trim();
  if (q) params.set("q", q);
  if (opts.entityId) params.set("like", opts.entityId);
  if (opts.costume && opts.costume !== "any") params.set("as", opts.costume);
  const qs = params.toString();
  return qs ? `/q?${qs}` : "/q";
}

export function parseShareParams(search: {
  get(name: string): string | null;
}): { query: string; entityId?: string; costume?: string } {
  const slugHint = search.get("who") ?? search.get("slug");
  const featured = slugHint ? amazeBySlug(slugHint) : undefined;
  const query = (search.get("q") ?? search.get("query") ?? featured?.query ?? "").trim();
  const entityId = search.get("like") ?? search.get("entityId") ?? undefined;
  const costume = search.get("as") ?? search.get("costume") ?? undefined;
  return {
    query,
    entityId: entityId || undefined,
    costume: costume || undefined,
  };
}
