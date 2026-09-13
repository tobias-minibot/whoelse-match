import { publicationsOf } from "./publications.js";
import { offersOf, seeksOf } from "./store.js";
import type { Candidate, Entity, Publication, WhoElseResult } from "./types.js";
import { isPrivateConstraintKey, publicPublicationsOf, visibilityOf, type Visibility } from "./visibility.js";

const PRIVATE_METADATA = new Set([
  "ownerPrincipalId",
  "owner_principal_id",
  "clerkUserId",
  "clerk_user_id",
  "credentialId",
  "credential_id",
  "principalId",
  "principal_id",
  "keyHash",
  "key_hash",
  "keyId",
  "accountId",
  "ageAffirmedAt",
  "age_affirmed_at",
  "ageAffirmationVersion",
  "age_affirmation_version",
  "ageAffirmationText",
]);

const PRIVATE_ATTRIBUTES = new Set([
  "authRequirements",
  "credentials",
  "apiKey",
  "api_key",
  "secret",
  "token",
  "ownerPrincipalId",
  "owner_principal_id",
  "clerkUserId",
  "clerk_user_id",
  "ageAffirmedAt",
  "ageAffirmationVersion",
  "ageAffirmationText",
  "datingIntent",
  "wantsMoreOf",
  "pace",
]);

export interface PublicPublication {
  id: string;
  entityId: string;
  kind: Publication["kind"];
  capability: string;
  phrases?: string[];
  constraints?: Publication["constraints"];
  evidence?: Publication["evidence"];
  status?: Publication["status"];
  created_at: string;
  updated_at: string;
}

/** Public card — never preferences, credentials, or ownership internals. */
export interface PublicEntity {
  id: string;
  type: string;
  name: string;
  description: string;
  publications?: PublicPublication[];
  offers: string[];
  seeks: string[];
  capabilities: string[];
  attributes: Record<string, unknown>;
  availability?: string;
  location?: Entity["location"];
  metadata: Record<string, unknown>;
  provenance: Entity["provenance"];
  trust?: Entity["trust"];
  created_at: string;
}

export function toPublicPublication(p: Publication): PublicPublication {
  return {
    id: p.id,
    entityId: p.entityId,
    kind: p.kind,
    capability: p.capability,
    phrases: p.phrases,
    constraints: p.constraints?.filter((c) => !isPrivateConstraintKey(c.key)),
    evidence: p.evidence,
    status: p.status,
    created_at: p.created_at,
    updated_at: p.updated_at,
  };
}

export function toPublicEntity(entity: Entity): PublicEntity {
  const metadata: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(entity.metadata ?? {})) {
    if (PRIVATE_METADATA.has(k)) continue;
    metadata[k] = v;
  }
  const attributes: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(entity.attributes ?? {})) {
    if (PRIVATE_ATTRIBUTES.has(k)) continue;
    attributes[k] = v;
  }
  return {
    id: entity.id,
    type: entity.type,
    name: entity.name,
    description: entity.description,
    publications: publicPublicationsOf(entity).map(toPublicPublication),
    offers: offersOf(entity),
    seeks: seeksOf(entity),
    capabilities: offersOf(entity),
    attributes,
    availability: entity.availability,
    location: entity.location,
    metadata,
    provenance: entity.provenance,
    trust: entity.trust,
    created_at: entity.created_at,
  };
}

/** Owner card — withdrawn pubs included; still no preferences / affirmation timestamp. */
export interface OwnerEntity extends PublicEntity {
  visibility: Visibility;
  ageAffirmed: boolean;
}

export function toOwnerEntity(entity: Entity): OwnerEntity {
  const pub = toPublicEntity(entity);
  return {
    ...pub,
    publications: publicationsOf(entity).map(toPublicPublication),
    visibility: visibilityOf(entity),
    ageAffirmed: entity.metadata?.ageAffirmed === true,
  };
}

export function toPublicCandidate(candidate: Candidate) {
  return {
    entity: toPublicEntity(candidate.entity),
    score: candidate.score,
    explanation: candidate.explanation,
    matched: candidate.matched
      ? {
          offer: candidate.matched.offer ? toPublicPublication(candidate.matched.offer) : undefined,
          seek: candidate.matched.seek ? toPublicPublication(candidate.matched.seek) : undefined,
          score: candidate.matched.score,
        }
      : undefined,
  };
}

export function toPublicWhoElseResult(result: WhoElseResult) {
  const candidates = result.candidates.map(toPublicCandidate);
  const humans = result.humans.map(toPublicCandidate);
  const ais = result.ais.map(toPublicCandidate);
  const byType: Record<string, ReturnType<typeof toPublicCandidate>[]> = {};
  for (const [type, list] of Object.entries(result.byType ?? {})) {
    byType[type] = list.map(toPublicCandidate);
  }
  return {
    query: result.query,
    inferredMode: result.inferredMode,
    inferredConstraints: result.inferredConstraints,
    inferredVertical: result.inferredVertical,
    inferredView: result.inferredView,
    universal: result.universal,
    usedOpenAiRerank: result.usedOpenAiRerank,
    candidates,
    pairs: result.pairs,
    humans,
    ais,
    byType,
  };
}

export function assertNoPrivateLeak(value: unknown, path = "root"): void {
  if (value == null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, i) => assertNoPrivateLeak(item, `${path}[${i}]`));
    return;
  }
  const rec = value as Record<string, unknown>;
  for (const key of Object.keys(rec)) {
    if (key === "preferences") {
      throw new Error(`public payload leaked preferences at ${path}`);
    }
    if (PRIVATE_METADATA.has(key) || PRIVATE_ATTRIBUTES.has(key)) {
      throw new Error(`public payload leaked ${key} at ${path}`);
    }
    if (key === "keyHash" || key === "key_hash") {
      throw new Error(`public payload leaked credential hash at ${path}`);
    }
    assertNoPrivateLeak(rec[key], `${path}.${key}`);
  }
}
