/**
 * Generic first-class entity in a universal matching layer.
 * Dating is the first ontology (seed + UI). Domain fields stay in attributes / preferences.
 *
 * Same primitive, two timescales:
 *   Human dating:     identity + offers + seeks + matching + trust + interaction
 *   Agent coordination: identity + offers + seeks + matching + trust + execution
 * Trust / reputation are receipt-backed aggregates. Payments are not implemented.
 */

/**
 * Survivors the live matcher actually uses as first-class objects.
 * RELATION and STATE exist as attributes (owner/fallbackTo, attributes.state) — not cores.
 * VIEW is inferVertical — presentation only. Verticals are costumes, not types.
 */
export const UNIVERSAL_PRIMITIVES = [
  "ENTITY",
  "OFFER",
  "SEEK",
  "CONSTRAINT",
  "EVIDENCE",
  "ACTION",
  "MATCH",
] as const;

/** Derived — stored on ENTITY.attributes, not a second graph or calendar. */
export const DERIVED_PRIMITIVES = ["RELATION", "STATE", "VIEW"] as const;

/**
 * Well-known CONSTRAINT keys. Open strings — verticals add *values*, not matchers.
 * Eligibility / reservation / remaining / radiusKm are reusable families
 * (not bank.find, restaurant.find, parking.find, or ambulance.find).
 */
export const CONSTRAINT_KEY_FAMILIES = {
  geo: ["city", "region", "neighborhood", "origin", "destination", "radiusKm"],
  money: ["price", "budget", "rent", "rate", "ticketSize", "currency"],
  space: ["bedrooms", "pets", "furnished", "listingKind"],
  time: ["availableFrom", "availableTo", "when", "start", "durationMonths", "durationWeeks"],
  state: ["state", "inStock", "openNow", "deliverToday", "urgency", "licensed"],
  party: ["seats"],
  /** Requirements / credentials / qualifiers published on the OFFER or SEEK. */
  eligibility: ["eligible", "income", "creditScore", "membership"],
  /** Bookable slot / hold at a time. ACTION `book` may follow; find only matches inventory-at-time. */
  reservation: ["reservation"],
  /** Remaining count — not boolean `inStock`. */
  inventory: ["remaining"],
} as const;

export type UniversalPrimitive = (typeof UNIVERSAL_PRIMITIVES)[number];

/** Seeded now. Open string so later types do not require a core fork. */
export const SEEDED_ENTITY_TYPES = [
  "human",
  "ai",
  "agent",
  "company",
  "service",
  "resource",
  "product",
  "dataset",
  "community",
] as const;

/** Reserved — later types do not require a core fork. */
export const RESERVED_ENTITY_TYPES = [
  "agent",
  "service",
  "company",
  "product",
  "dataset",
  "resource",
  "community",
  "report",
] as const;

/**
 * Marketplace role on an entity — not a new type.
 * New verticals add role *strings* (seller/investor/expert…) — not new primitives.
 * Travel reuses listing/seeker on purpose (apartment overlap is the experiment).
 */
export const OFFER_ROLES = [
  "listing",
  "opening",
  "employer",
  "worker",
  "driver",
  "provider",
  "seller",
  "investor",
  "expert",
  "speaker",
  "event",
  "caregiver",
  "compute",
  "publisher",
] as const;
export const SEEK_ROLES = [
  "seeker",
  "applicant",
  "passenger",
  "client",
  "buyer",
  "founder",
  "asker",
  "attendee",
  "parent",
  "workload",
  "researcher",
] as const;

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
export type InferredVertical =
  | "dating"
  | "apartment"
  | "jobs"
  | "rides"
  | "services"
  | "capability"
  | "products"
  | "experts"
  | "capital"
  | "travel"
  | "events"
  | "childcare"
  | "collab"
  | "compute"
  | "data"
  | "local";
export type InferredView = InferredVertical;
export type TrustStatus = "unscored" | "stub" | "evidence";
/** MATCH lifecycle. One row per SEEK↔OFFER pair (or requester↔candidate when pubs are omitted). */
export type MatchStatus =
  | "proposed"
  | "accepted"
  | "declined"
  | "invoked"
  | "completed"
  | "cancelled"
  | "expired"
  | "verified";
/** RECEIPT lifecycle — every attempted interaction, not dating-specific. */
export type ReceiptStatus =
  | "proposed"
  | "accepted"
  | "declined"
  | "started"
  | "completed"
  | "failed"
  | "cancelled";
/** Structured ACT kinds. Same objects for humans and agents. */
export type ActionType =
  | "connect"
  | "intro"
  | "message"
  | "accept"
  | "decline"
  | "cancel"
  | "invoke"
  | "delegate"
  | "negotiate"
  | "handoff";
export type EvidenceKind = "verified" | "portfolio" | "outcome" | "license" | "reference" | "receipt" | "disclosure";
/** First-class network object kind. String bags on ENTITY are derived views. */
export type PublicationKind = "offer" | "seek";
/** Record lifecycle. Query-level `MatchSide` stays on WhoElseConstraints — not this field. */
export type PublicationStatus = "active" | "withdrawn" | "expired";
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
    /** Coverage / distance in km. City equality is not a hard gate when set. */
    radiusKm?: number;
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

/**
 * First-class OFFER or SEEK on the shared find layer.
 * Catalog intent IDs (505) are aliases/eval — not this runtime enum.
 * `kind` is the record side (offer vs seek). Query `side` is HAS vs NEEDS.
 */
export interface Publication {
  id: string;
  entityId: string;
  kind: PublicationKind;
  /** Capability / type noun this record is about. */
  capability: string;
  /** Extra phrases that participate in matching (compat with string bags). */
  phrases?: string[];
  constraints?: AttributeConstraint[];
  evidence?: TrustEvidence;
  /** Default active. Withdrawn / expired records are skipped by find pairing. */
  status?: PublicationStatus;
  created_at: string;
  updated_at: string;
}

export type OfferRecord = Publication & { kind: "offer" };
export type SeekRecord = Publication & { kind: "seek" };

/** Input shape for register / publish. Strings still accepted. */
export interface PublicationSpec {
  id?: string;
  kind: PublicationKind;
  capability: string;
  phrases?: string[];
  constraints?: AttributeConstraint[];
  evidence?: TrustEvidence;
  status?: PublicationStatus;
  created_at?: string;
}

export type PublicationInput = string | Omit<PublicationSpec, "kind"> | PublicationSpec;

export interface Entity {
  id: string;
  type: EntityType;
  name: string;
  description: string;
  /** First-class OFFER / SEEK records. Hydrated from string bags on load. */
  publications?: Publication[];
  /** What this entity can provide. Derived from offer records when present. */
  offers: string[];
  /** What this entity wants / needs / intends. Derived from seek records when present. */
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
  /**
   * Coverage / distance in km (geo-radius). When set, city equality is not a
   * hard gate — “within 5 km” is not “Washington, DC”.
   */
  radiusKm?: number;
}

export interface WhoElseRequest {
  /** Natural-language intent, or free text plus an optional exemplar. Not dating-specific. */
  context?: string;
  /** Extra predicate / relation on the intent (role, capability, …). */
  predicate?: string;
  constraints?: WhoElseConstraints;
  exclude?: string[];
  /** Already-known ids — merged into exclude (pagination / “not these”). */
  knownEntities?: string[];
  mode?: WhoElseMode;
  /** Who is asking. Excluded from results; their live OFFER/SEEK records pair against candidates. */
  requester?: string;
  /** When set, treat this entity as the exemplar (recursive WhoElse). */
  entityId?: string;
  /**
   * Recursive Who else? from an existing MATCH.
   * Excludes both parties and carries the match query / publication constraints.
   * Find still does not persist a MATCH.
   */
  matchId?: string;
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
  /** Network history. 0 when the entity has no receipts. */
  reputation?: number;
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
  /** Best OFFER↔SEEK pair that fired for this candidate. */
  matched?: {
    offer?: Publication;
    seek?: Publication;
    score?: number;
  };
}

/** High-confidence complementary pair of durable (or query-synthetic) records. */
export interface PublicationPair {
  offer: Publication;
  seek: Publication;
  score: number;
  offerEntityId: string;
  seekEntityId: string;
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
  /** live = real network; playground = labeled demo corpus. Never mixed. */
  pool?: "live" | "playground";
  candidates: Candidate[];
  /** High-confidence OFFER↔SEEK pairs (score ≥ 0.85). Alongside entity candidates. */
  pairs: PublicationPair[];
  /** Convenience views for the dating client. Prefer `byType` for new surfaces. */
  humans: Candidate[];
  ais: Candidate[];
  byType: Record<string, Candidate[]>;
  /** Vocab labels this result was composed from. Absent on atomic find. */
  composedFrom?: string[];
  /** Dispatch + reconcile metadata. Quiet on the human box; first-class for MCP. */
  composition?: {
    strategy: string;
    explanation: string;
    plan?: unknown;
  };
}

export interface RegistrationSpec {
  name: string;
  description: string;
  /** At least one offer or seek required (string or structured record). */
  offers?: PublicationInput[];
  seeks?: PublicationInput[];
  publications?: PublicationSpec[];
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

/**
 * Durable MATCH. One row per SEEK↔OFFER pair (or requester↔candidate when
 * publication ids are omitted). Find scoring never writes this — propose is
 * an explicit act (`whoelse.match` / POST /api/matches / UI “Propose match”).
 */
export interface MatchRecord {
  id: string;
  query: string;
  /** Party who proposed / is asking. */
  requesterEntityId: string;
  /** Counterparty being proposed. */
  candidateEntityId: string;
  seekEntityId?: string;
  offerEntityId?: string;
  /** First-class publication ids when the match is an OFFER↔SEEK pair. */
  offerPublicationId?: string;
  seekPublicationId?: string;
  side?: MatchSide;
  score?: number;
  explanation?: { why: string; commonalities?: string[] };
  evidence: TrustEvidence;
  status: MatchStatus;
  created_at: string;
  updated_at: string;
  receiptId?: string;
}

/**
 * Structured RECEIPT for every attempted interaction.
 * Extends the older invoke stub: `fromAgentId`/`toAgentId`/`task`/`would`/`result`/`at`
 * stay as aliases so existing MCP clients keep working.
 */
export interface InvokeReceipt {
  id: string;
  matchId?: string;
  actorEntityId: string;
  counterpartyEntityId: string;
  actionType: ActionType;
  status: ReceiptStatus;
  outcome: Record<string, unknown>;
  /** @deprecated Alias of actorEntityId — agent invoke/delegate. */
  fromAgentId?: string;
  /** @deprecated Alias of counterpartyEntityId. */
  toAgentId: string;
  task: string;
  would: string;
  result: Record<string, unknown>;
  evidence: TrustEvidence;
  at: string;
  updated_at: string;
}

export type Receipt = InvokeReceipt;

/** Portable network reputation — aggregates + receipt ids, not self-asserted verified. */
export interface ReputationRecord {
  entityId: string;
  completionReliability: number;
  responseRate: number;
  acceptanceRate: number;
  failureRate: number;
  verifiedSuccesses: number;
  proposed: number;
  accepted: number;
  declined: number;
  started: number;
  completed: number;
  failed: number;
  cancelled: number;
  evidenceReceiptIds: string[];
  updated_at: string;
}

export interface ThreadMessage {
  id: string;
  matchId: string;
  fromEntityId: string;
  body: string;
  created_at: string;
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
  /** Entities that have at least one offer phrase (compat). */
  offers: number;
  /** Entities that have at least one seek phrase (compat). */
  seeks: number;
  /** First-class OFFER records. */
  offerRecords: number;
  /** First-class SEEK records. */
  seekRecords: number;
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
