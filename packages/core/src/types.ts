/**
 * Generic first-class entity in a universal matching layer.
 * Dating is the first ontology (seed + UI). Domain fields stay in attributes / preferences.
 *
 * Same primitive, two timescales:
 *   Human dating:     identity + offers + seeks + matching + trust + interaction
 *   Agent coordination: identity + offers + seeks + matching + trust + execution
 * Trust / execution / reputation / payments are not implemented — fields are left open.
 */

/** Seeded now. Open string so later types do not require a core fork. */
export const SEEDED_ENTITY_TYPES = ["human", "ai", "agent"] as const;

/** Reserved — do not emit in the dating MVP; the matcher already accepts them. */
export const RESERVED_ENTITY_TYPES = [
  "agent",
  "service",
  "company",
  "product",
  "dataset",
  "resource",
] as const;

export type SeededEntityType = (typeof SEEDED_ENTITY_TYPES)[number];
export type ReservedEntityType = (typeof RESERVED_ENTITY_TYPES)[number];
/** Open-ended. Seed uses human | ai. */
export type EntityType = string;

export type Provenance = "synthetic" | "ai_generated" | "user";
export type WhoElseMode = "substitute" | "expand" | "peers";

export interface GeoLocation {
  city?: string;
  region?: string;
  country?: string;
}

export interface Entity {
  id: string;
  type: EntityType;
  name: string;
  description: string;
  /** What this entity can provide. Alias of the capability side of matching. */
  offers: string[];
  /** What this entity wants / needs / intends. */
  seeks: string[];
  /**
   * @deprecated Prefer `offers`. Kept as a mirror so older clients keep working.
   * Normalized to `offers` on load.
   */
  capabilities: string[];
  attributes: Record<string, unknown>;
  preferences: Record<string, unknown>;
  availability?: string;
  location?: GeoLocation;
  embedding?: number[];
  metadata: Record<string, unknown>;
  provenance: Provenance;
  /**
   * Stub only. Reputation / verification / payments are not implemented.
   * Shape exists so later trust graphs do not require a schema break.
   */
  trust?: {
    status: "unscored" | "stub";
    provenance?: Provenance;
    notes?: string;
  };
  created_at: string;
}

export interface WhoElseConstraints {
  type?: EntityType;
  city?: string;
  region?: string;
  country?: string;
  /** Client-side keyword filter; not dating-specific. */
  interests?: string[];
  offers?: string[];
  seeks?: string[];
  /** @deprecated Prefer `offers`. */
  capabilities?: string[];
  limit?: number;
}

export interface WhoElseRequest {
  /** Natural-language intent, or free text plus an optional exemplar. Not dating-specific. */
  context: string;
  /** Extra predicate / relation on the intent (role, capability, …). */
  predicate?: string;
  constraints?: WhoElseConstraints;
  exclude?: string[];
  /** Already-known ids — merged into exclude (pagination / “not these”). */
  knownEntities?: string[];
  mode?: WhoElseMode;
  /** Who is asking. Excluded from results; optional exemplar-adjacent context. */
  requester?: string;
  /** When set, treat this entity as the exemplar (recursive WhoElse). */
  entityId?: string;
  limit?: number;
  /** Soft availability phrase, e.g. "always on". */
  availability?: string;
  ranking?: "score" | "sectioned";
  /** Stub only — entities without a score still pass unless this is set to a future real grade. */
  minTrust?: "any" | "unscored" | "stub";
}

export interface ScoreBreakdown {
  text: number;
  structured: number;
  location: number;
  feedback: number;
  rerank?: number;
  total: number;
}

export interface MatchExplanation {
  why: string;
  commonalities: string[];
  surprisingDifference?: string;
  scoreBreakdown: ScoreBreakdown;
}

export interface Candidate {
  entity: Entity;
  score: number;
  explanation: MatchExplanation;
}

export interface WhoElseResult {
  query: string;
  inferredMode: WhoElseMode;
  inferredConstraints: WhoElseConstraints;
  usedOpenAiRerank: boolean;
  candidates: Candidate[];
  /** Convenience views for the dating client. Prefer `byType` for new surfaces. */
  humans: Candidate[];
  ais: Candidate[];
  byType: Record<string, Candidate[]>;
}

export interface FeedbackEvent {
  entityId: string;
  signal: "more" | "less";
  query?: string;
  at: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface InterestRecord {
  entityId: string;
  at: string;
  note?: string;
}
