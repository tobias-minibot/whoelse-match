import type {
  Entity,
  MatchSide,
  Publication,
  PublicationInput,
  PublicationKind,
  PublicationSpec,
  PublicationStatus,
} from "./types.js";
import { jaccard, tokenize } from "./text.js";

export const LIVE_PUBLICATION_STATUS: PublicationStatus = "active";

export function isLivePublication(p: Publication): boolean {
  return !p.status || p.status === LIVE_PUBLICATION_STATUS;
}

export function slugCapability(capability: string): string {
  return capability.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "capability";
}

export function publicationId(
  entityId: string,
  kind: PublicationKind,
  capability: string,
  explicit?: string,
): string {
  return explicit ?? `pub-${kind}-${entityId}-${slugCapability(capability)}`;
}

export function normalizePublication(
  partial: PublicationSpec & { entityId: string },
  now = new Date().toISOString(),
): Publication {
  const capability = (partial.capability ?? partial.phrases?.[0] ?? "").trim();
  if (!capability) throw new Error("publication requires capability");
  return {
    id: publicationId(partial.entityId, partial.kind, capability, partial.id),
    entityId: partial.entityId,
    kind: partial.kind,
    capability,
    phrases: unique([capability, ...(partial.phrases ?? [])]),
    constraints: partial.constraints ?? [],
    evidence: partial.evidence,
    status: partial.status ?? LIVE_PUBLICATION_STATUS,
    created_at: partial.created_at ?? now,
    updated_at: now,
  };
}

export function publicationsOf(entity: Entity): Publication[] {
  return entity.publications ?? [];
}

export function activePublicationsOf(entity: Entity): Publication[] {
  return publicationsOf(entity).filter(isLivePublication);
}

export function offerRecordsOf(entity: Entity): Publication[] {
  return activePublicationsOf(entity).filter((p) => p.kind === "offer");
}

export function seekRecordsOf(entity: Entity): Publication[] {
  return activePublicationsOf(entity).filter((p) => p.kind === "seek");
}

export function phrasesOf(pubs: Publication[]): string[] {
  return unique(pubs.flatMap((p) => [p.capability, ...(p.phrases ?? [])]));
}

export function bagsFromPublications(pubs: Publication[]): { offers: string[]; seeks: string[] } {
  const live = pubs.filter(isLivePublication);
  return {
    offers: phrasesOf(live.filter((p) => p.kind === "offer")),
    seeks: phrasesOf(live.filter((p) => p.kind === "seek")),
  };
}

export function upsertPublications(existing: Publication[], incoming: Publication[]): Publication[] {
  const byId = new Map(existing.map((p) => [p.id, p]));
  const byKey = new Map(existing.map((p) => [recordKey(p), p]));
  for (const next of incoming) {
    const prior = byId.get(next.id) ?? byKey.get(recordKey(next));
    if (prior) {
      const merged: Publication = {
        ...prior,
        ...next,
        id: prior.id,
        entityId: next.entityId,
        phrases: unique([...(prior.phrases ?? []), ...(next.phrases ?? [])]),
        constraints: next.constraints?.length ? next.constraints : prior.constraints,
        evidence: next.evidence ?? prior.evidence,
        status: next.status ?? prior.status ?? LIVE_PUBLICATION_STATUS,
        created_at: prior.created_at,
        updated_at: next.updated_at,
      };
      byId.delete(prior.id);
      byKey.delete(recordKey(prior));
      byId.set(merged.id, merged);
      byKey.set(recordKey(merged), merged);
    } else {
      byId.set(next.id, next);
      byKey.set(recordKey(next), next);
    }
  }
  return [...byId.values()];
}

export function parsePublicationInputs(kind: PublicationKind, items?: PublicationInput[]): PublicationSpec[] {
  if (!items?.length) return [];
  return items.map((item) => {
    if (typeof item === "string") return { kind, capability: item };
    const capability = ("capability" in item && item.capability) || item.phrases?.[0] || "";
    return { ...item, kind: "kind" in item && item.kind ? item.kind : kind, capability };
  });
}

export function hydratePublications(entity: Entity): Publication[] {
  const now = entity.created_at || new Date().toISOString();
  const explicit = (entity.publications ?? []).map((p) =>
    normalizePublication({ ...p, entityId: entity.id, kind: p.kind }, p.created_at ?? now),
  );
  const covered = new Set(
    explicit.flatMap((p) =>
      [p.capability, ...(p.phrases ?? [])].map((s) => `${p.kind}:${s.toLowerCase()}`),
    ),
  );
  const bags: PublicationSpec[] = [
    ...parsePublicationInputs("offer", [...(entity.offers ?? []), ...(entity.capabilities ?? [])]),
    ...parsePublicationInputs("seek", entity.seeks ?? []),
  ].filter(
    (spec) => spec.capability.trim() && !covered.has(`${spec.kind}:${spec.capability.toLowerCase()}`),
  );
  const fromBags = bags.map((spec) => normalizePublication({ ...spec, entityId: entity.id }, now));
  return upsertPublications(explicit, fromBags);
}

export function queryAsPublications(text: string, side?: MatchSide): Publication[] {
  const cap = text.trim();
  if (!cap) return [];
  const now = new Date().toISOString();
  const kinds: PublicationKind[] =
    side === "offer" ? ["seek"] : side === "seek" ? ["offer"] : ["seek", "offer"];
  return kinds.map((kind) =>
    normalizePublication({ id: `pub-query-${kind}`, entityId: "query", kind, capability: cap }, now),
  );
}

/**
 * Phrase overlap for two publications (or a publication vs raw query text).
 * Short generic nouns ("work") do not get substring credit — that flooded first-five.
 */
export function capabilityOverlap(a: Publication, b: Publication | string): number {
  const otherText = typeof b === "string" ? b : [b.capability, ...(b.phrases ?? [])].join(" ");
  const selfText = [a.capability, ...(a.phrases ?? [])].join(" ");
  const aLow = a.capability.toLowerCase();
  const bLow = (typeof b === "string" ? b : b.capability).toLowerCase();
  if (aLow && aLow === bLow) return 1;
  if (aLow.length >= 12 && otherText.toLowerCase().includes(aLow)) return 0.92;
  if (bLow.length >= 12 && selfText.toLowerCase().includes(bLow)) return 0.92;
  const ta = tokenize(selfText);
  const tb = tokenize(otherText);
  const queryLike =
    typeof b === "string" || a.entityId === "query" || b.entityId === "query";
  if (queryLike) {
    const inter = new Set(ta.filter((t) => tb.includes(t)));
    // One shared token ("date") must not beat the dating cluster.
    if (inter.size < 2) return 0;
  }
  return jaccard(ta, tb);
}

function isQueryPublication(p?: Publication): boolean {
  return p?.entityId === "query";
}

function preferDurable(
  current: { score: number; offer?: Publication; seek?: Publication },
  next: { score: number; offer?: Publication; seek?: Publication },
): boolean {
  if (next.score > current.score) return true;
  if (next.score < current.score || next.score <= 0) return false;
  const currentQuery = isQueryPublication(current.offer) || isQueryPublication(current.seek);
  const nextQuery = isQueryPublication(next.offer) || isQueryPublication(next.seek);
  return currentQuery && !nextQuery;
}

/** Query-as-publication plus live records from requester / exemplar entities. */
export function counterpartPublications(
  queryText: string,
  side?: MatchSide,
  counterparts?: Entity[],
): Publication[] {
  const fromEntities = (counterparts ?? []).flatMap((e) => activePublicationsOf(e));
  return [...fromEntities, ...queryAsPublications(queryText, side)];
}

export function bestPublicationMatch(
  entity: Entity,
  queryText: string,
  side?: MatchSide,
  counterparts?: Entity | Entity[],
): { score: number; offer?: Publication; seek?: Publication } {
  const pubs = activePublicationsOf(entity);
  const other = Array.isArray(counterparts) ? counterparts : counterparts ? [counterparts] : [];
  const queryPubs = counterpartPublications(queryText, side, other);
  let best: { score: number; offer?: Publication; seek?: Publication } = { score: 0 };

  const consider = (offer: Publication | undefined, seek: Publication | undefined, score: number) => {
    const next = { score, offer, seek };
    if (preferDurable(best, next)) best = next;
  };

  const entityOffers = pubs.filter((p) => p.kind === "offer");
  const entitySeeks = pubs.filter((p) => p.kind === "seek");
  const qOffers = queryPubs.filter((p) => p.kind === "offer");
  const qSeeks = queryPubs.filter((p) => p.kind === "seek");

  for (const offer of entityOffers) {
    for (const seek of qSeeks) consider(offer, seek, capabilityOverlap(offer, seek));
  }
  for (const seek of entitySeeks) {
    for (const offer of qOffers) consider(offer, seek, capabilityOverlap(offer, seek));
  }
  if (!side) {
    for (const offer of entityOffers) {
      for (const q of qOffers) consider(offer, undefined, capabilityOverlap(offer, q) * 0.85);
    }
    for (const seek of entitySeeks) {
      for (const q of qSeeks) consider(undefined, seek, capabilityOverlap(seek, q) * 0.85);
    }
  }
  return best;
}

function recordKey(p: Pick<Publication, "kind" | "capability">): string {
  return `${p.kind}:${p.capability.toLowerCase()}`;
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((s) => s.trim()).filter(Boolean))];
}
