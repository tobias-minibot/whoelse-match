/**
 * Launch visibility: user humans start private and stay out of public find
 * until they store an 18+ age affirmation. Seed/synthetic rows stay public.
 *
 * Model (simplest coherent):
 *   private  — owner can read/edit via /api/me; whoelse.find skips the entity
 *   public   — appears in find after affirmation
 *
 * No authenticated-only middle state. Dating-relevant SEEKs stay withdrawn
 * until affirmation, then may activate. Same OFFER/SEEK objects — no dating type.
 */

import { bagsFromPublications, isLivePublication } from "./publications.js";
import type { Entity, Publication } from "./types.js";

export const VISIBILITY_PRIVATE = "private" as const;
export const VISIBILITY_PUBLIC = "public" as const;
export type Visibility = typeof VISIBILITY_PRIVATE | typeof VISIBILITY_PUBLIC;

/** Frozen copy. Store the version string with the timestamp — not this text in public DTOs. */
export const AGE_AFFIRMATION_VERSION = "v1";
export const AGE_AFFIRMATION_TEXT =
  "I affirm that I am 18 years of age or older. WhoElse is for adults. A public profile and dating-relevant seeks (romantic compatibility and similar) require this affirmation. I understand this is not age verification by a third party — it is my statement.";

const DATING_SEEK_RE =
  /\b(romantic|romance|dating|date|partner|partnership|relationship|compatibility|courtship|boyfriend|girlfriend|spouse|marriage|soulmate)\b/i;

const PRIVATE_CONSTRAINT_KEYS = new Set(["_heldUntilAffirm", "heldUntilAffirm"]);

export function isDatingRelevantSeek(p: Pick<Publication, "kind" | "capability" | "phrases">): boolean {
  if (p.kind !== "seek") return false;
  return DATING_SEEK_RE.test([p.capability, ...(p.phrases ?? [])].join(" "));
}

export function visibilityOf(entity: Entity): Visibility {
  const raw = entity.metadata?.visibility;
  if (raw === VISIBILITY_PRIVATE) return VISIBILITY_PRIVATE;
  if (raw === VISIBILITY_PUBLIC) return VISIBILITY_PUBLIC;
  if (entity.type === "human" && entity.provenance === "user") return VISIBILITY_PRIVATE;
  return VISIBILITY_PUBLIC;
}

export function isAgeAffirmed(entity: Entity): boolean {
  return entity.metadata?.ageAffirmed === true;
}

/**
 * Public find / anonymous entity GET.
 * Synthetic seed humans remain findable (labeled demo). User humans need
 * visibility=public AND ageAffirmed.
 */
export function isPubliclyFindable(entity: Entity): boolean {
  if (visibilityOf(entity) === VISIBILITY_PRIVATE) return false;
  if (entity.type === "human" && entity.provenance === "user" && !isAgeAffirmed(entity)) {
    return false;
  }
  return true;
}

export function publicPublicationsOf(entity: Entity): Publication[] {
  return (entity.publications ?? []).filter(isLivePublication);
}

export function isPrivateConstraintKey(key: string): boolean {
  return PRIVATE_CONSTRAINT_KEYS.has(key);
}

export function applyHumanSafety(
  entity: Entity,
  opts: { affirmed: boolean; activateDatingSeeks?: boolean },
): Entity {
  const now = new Date().toISOString();
  const publications = (entity.publications ?? []).map((p) => {
    if (!opts.affirmed && isDatingRelevantSeek(p) && p.status !== "withdrawn" && p.status !== "expired") {
      return { ...p, status: "withdrawn" as const, updated_at: now };
    }
    if (
      opts.affirmed &&
      opts.activateDatingSeeks &&
      isDatingRelevantSeek(p) &&
      p.status === "withdrawn"
    ) {
      return { ...p, status: "active" as const, updated_at: now };
    }
    return p;
  });
  const bags = bagsFromPublications(publications);
  return {
    ...entity,
    publications,
    offers: bags.offers,
    seeks: bags.seeks,
    capabilities: bags.offers,
    metadata: {
      ...entity.metadata,
      kindLabel: "human",
      humanNotAi: true,
      visibility: opts.affirmed ? VISIBILITY_PUBLIC : VISIBILITY_PRIVATE,
      ageAffirmed: opts.affirmed,
    },
  };
}

export function humanEntityIdFor(principalId: string): string {
  return `human-${principalId}`;
}
