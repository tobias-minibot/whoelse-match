/**
 * Generic first-class entity in a universal matching layer.
 * Dating is the first ontology (seed + UI). Domain fields stay in attributes / preferences.
 *
 * Same primitive, two timescales:
 *   Human dating:     identity + offers + seeks + matching + trust + interaction
 *   Agent coordination: identity + offers + seeks + matching + trust + execution
 * Trust / execution / reputation / payments are not implemented — fields are left open.
 */

/**
 * Survivors after costume collapse. Verticals are views, not types.
 * Domain adapters/policies/presentation may know “dating”; the ranker must not.
 */
export const UNIVERSAL_PRIMITIVES = [
  "ENTITY",
  "OFFER",
  "SEEK",
  "RELATION",
  "CONSTRAINT",
  "EVIDENCE",
  "STATE",
  "ACTION",
] as const;

export type UniversalPrimitive = (typeof UNIVERSAL_PRIMITIVES)[number];

/** Seeded now. Open string so later types do not require a core fork. */
export const SEEDED_ENTITY_TYPES = ["human", "ai", "agent", "company", "service", "resource"] as const;

/** Reserved — later types do not require a core fork. */
export const RESERVED_ENTITY_TYPES = [
  "agent",
  "service",
  "company",
  "product",
  "dataset",
  "resource",
] as const;

/**
 * Marketplace role on an entity — not a new type.
 * Offer-side: listing / opening / employer / worker / driver / provider
 * Seek-side: seeker / applicant / passenger / client
 */
export const OFFER_ROLES = ["listing", "opening", "employer", "worker", "driver", "provider"] as const;
export const SEEK_ROLES = ["seeker", "applicant", "passenger", "client"] as const;

export type OfferRole = (typeof OFFER_ROLES)[number];
export type SeekRole = (typeof SEEK_ROLES)[number];
export type MarketRole = OfferRole | SeekRole;

export type SeededEntityType = (typeof SEEDED_ENTITY_TYPES)[number];
export type ReservedEntityType = (typeof RESERVED_ENTITY_TYPES)[number];
/** Open-ended. Seed uses human | ai. */
export type EntityType = string;

export type Provenance = "synthetic" | "ai_generated" | "user";
export type WhoElseMode = "substitute" | "expand" | "peers";
/** Marketplace direction: who HAS the thing vs who NEEDS it. Not vertical-specific. */
export type MatchSide = "offer" | "seek";
export type AttributeOp = "eq" | "lte" | "gte" | "includes" | "truthy" | "neq";
/** Costume hint from language — never a second matcher. A view over the same network. */
export type InferredVertical = "dating" | "apartment" | "jobs" | "rides" | "services" | "capability";
export type InferredView = InferredVertical;
export type TrustStatus = "unscored" | "stub" | "evidence";
export type MatchStatus = "proposed" | "accepted" | "invoked" | "verified" | "declined" | "expired";
export type EvidenceKind = "verified" | "portfolio" | "outcome" | "license" | "reference" | "receipt" | "disclosure";
export type RelationKind = "owner" | "fallback" | "complement" | "delegate";
export type EndpointProtocol = "http" | "mcp" | "stub";

/**
 * Smallest useful trust — evidence, not a reputation market.
 * verification / portfolio / past outcomes are fields, not scores for sale.
 */
export interface TrustEvidence {
  verified?: boolean;
  verifiedBy?: string;
  portfolio?: string[];
  outcomes?: { label: string; result?: string }[];
  licenses?: string[];
  references?: string[];
  receipts?: string[];
}

export interface TrustArtifact {
  kind: EvidenceKind;
  label: string;
  detail?: string;
  href?: string;
}

export interface Relation {
  kind: RelationKind;
  from: string;
  to: string;
}

export interface Endpoint {
  protocol: EndpointProtocol;
  url: string;
  auth?: string;
}

/**
 * NL → WhoElse representation. Vertical is an inferred view, not a matcher.
 */
export interface UniversalQuery {
  text: string;
  side?: MatchSide;
  entityType?: string;
  relation?: string;
  roles?: string[];
  hard: AttributeConstraint[];
  soft: {
    city?: string;
    region?: string;
    neighborhood?: string;
    cheaper?: boolean;
    labels?: string[];
  };
  evidenceNeeds: EvidenceKind[];
  state?: { op: AttributeOp; value: string };
  ranking: WhoElseMode;
  view?: InferredView;
}

export interface TrustRecord {
  status: TrustStatus;
  provenance?: Provenance;
  notes?: string;
  evidence?: TrustEvidence;
}

/** Generic structured filter. Apartment rent/bedrooms/pets are just keys. */
export interface AttributeConstraint {
  key: string;
  op: AttributeOp;
  value?: unknown;
}

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
   * Evidence stub — not a reputation graph or market.
   * Fill verified / portfolio / outcomes without renaming this field.
   */
  trust?: TrustRecord;
  created_at: string;
}

export interface WhoElseConstraints {
  type?: EntityType;
  city?: string;
  region?: string;
  country?: string;
  neighborhood?: string;
  /** Client-side keyword filter; not dating-specific. */
  interests?: string[];
  offers?: string[];
  seeks?: string[];
  /** @deprecated Prefer `offers`. */
  capabilities?: string[];
  limit?: number;
  /**
   * Who HAS vs who NEEDS.
   * offer = return entities that provide the thing (listings, rides, jobs…).
   * seek = return entities that want the thing (renters, passengers, applicants…).
   */
  side?: MatchSide;
  /** Generic attribute filters (price, bedrooms, pets, dates, rate, seats, …). */
  attributes?: AttributeConstraint[];
  /**
   * Marketplace roles to keep. Generic — jobs use opening/worker/applicant,
   * rides use driver/passenger, services use provider/client.
   */
  roles?: string[];
  /** Optional changing-state filter (open / full / departing / completed). */
  state?: string;
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
  /** Stub only — "evidence" keeps entities that attached portfolio/outcomes/verified. */
  minTrust?: "any" | "unscored" | "stub" | "evidence";
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
  inferredVertical?: InferredVertical;
  /** Alias of inferredVertical — costume is a view. */
  inferredView?: InferredView;
  universal?: UniversalQuery;
  usedOpenAiRerank: boolean;
  candidates: Candidate[];
  /** Convenience views for the dating client. Prefer `byType` for new surfaces. */
  humans: Candidate[];
  ais: Candidate[];
  byType: Record<string, Candidate[]>;
}

export interface RegistrationSpec {
  name: string;
  description: string;
  offers: string[];
  seeks?: string[];
  type?: EntityType;
  id?: string;
  owner?: string;
  version?: string;
  status?: string;
  protocol?: string;
  requirements?: string[];
  permissions?: string[];
  cost?: number | string;
  latency?: number | string;
  availability?: string;
  evidence?: TrustEvidence;
  endpoint?: Endpoint;
  location?: GeoLocation;
}

export interface MatchRecord {
  id: string;
  query: string;
  seekEntityId?: string;
  offerEntityId?: string;
  side?: MatchSide;
  evidence: TrustEvidence;
  status: MatchStatus;
  created_at: string;
  updated_at: string;
  receiptId?: string;
}

export interface InvokeReceipt {
  id: string;
  fromAgentId?: string;
  toAgentId: string;
  task: string;
  would: string;
  result: Record<string, unknown>;
  evidence: TrustEvidence;
  at: string;
}

export interface DelegationResult {
  ok: boolean;
  task: string;
  intent: string;
  from?: string;
  found: Candidate[];
  selected?: Candidate;
  invoked?: {
    ok: true;
    stub: true;
    agent: { id: string; name: string; type: string };
    would: string;
    result: Record<string, unknown>;
  };
  receipt?: InvokeReceipt;
  match?: MatchRecord;
  reason?: string;
}

export interface NetworkStats {
  entities: number;
  offers: number;
  seeks: number;
  matches: number;
  unmatched: number;
  invoked: number;
  missingSupply: { query: string; view?: string }[];
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
