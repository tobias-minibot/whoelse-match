import { boolean, doublePrecision, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { AgentScope } from "../authz.js";
import type {
  ActionType,
  Entity,
  MatchStatus,
  Publication,
  ReceiptStatus,
  TrustEvidence,
} from "../types.js";

export const principals = pgTable("principals", {
  id: text("id").primaryKey(),
  kind: text("kind").$type<"human" | "agent">().notNull(),
  displayName: text("display_name"),
  clerkUserId: text("clerk_user_id"),
  synthetic: boolean("synthetic").notNull().default(false),
  ageAffirmedAt: timestamp("age_affirmed_at", { withTimezone: true }),
  ageAffirmationVersion: text("age_affirmation_version"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    principalId: text("principal_id").notNull(),
    clerkUserId: text("clerk_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex("accounts_clerk_user_id_idx").on(t.clerkUserId)],
);

export const agentCredentials = pgTable(
  "agent_credentials",
  {
    id: text("id").primaryKey(),
    principalId: text("principal_id").notNull(),
    keyId: text("key_id").notNull(),
    keyHash: text("key_hash").notNull(),
    scopes: jsonb("scopes").$type<AgentScope[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    rotatedAt: timestamp("rotated_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("agent_credentials_key_id_idx").on(t.keyId), index("agent_credentials_principal_idx").on(t.principalId)],
);

export const entities = pgTable(
  "entities",
  {
    id: text("id").primaryKey(),
    ownerPrincipalId: text("owner_principal_id").notNull(),
    type: text("type").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    body: jsonb("body").$type<Entity>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("entities_owner_idx").on(t.ownerPrincipalId)],
);

export const ownership = pgTable(
  "ownership",
  {
    entityId: text("entity_id").notNull(),
    principalId: text("principal_id").notNull(),
    role: text("role").$type<"owner" | "delegate">().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.entityId, t.principalId] })],
);

export const publications = pgTable(
  "publications",
  {
    id: text("id").primaryKey(),
    entityId: text("entity_id").notNull(),
    kind: text("kind").$type<"offer" | "seek">().notNull(),
    capability: text("capability").notNull(),
    status: text("status").$type<"active" | "withdrawn" | "expired">().notNull(),
    body: jsonb("body").$type<Publication>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex("publications_entity_kind_capability_idx").on(t.entityId, t.kind, t.capability)],
);

export const writeAudit = pgTable(
  "write_audit",
  {
    id: text("id").primaryKey(),
    at: timestamp("at", { withTimezone: true }).notNull(),
    principalId: text("principal_id"),
    action: text("action").notNull(),
    entityId: text("entity_id"),
    publicationId: text("publication_id"),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
  },
  (t) => [index("write_audit_at_idx").on(t.at)],
);

export const rateCounters = pgTable("rate_counters", {
  bucket: text("bucket").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull(),
});

/** One MATCH row per SEEK↔OFFER pair (or requester↔candidate when pubs omitted). */
export const matches = pgTable(
  "matches",
  {
    id: text("id").primaryKey(),
    requesterEntityId: text("requester_entity_id").notNull(),
    candidateEntityId: text("candidate_entity_id").notNull(),
    seekEntityId: text("seek_entity_id"),
    offerEntityId: text("offer_entity_id"),
    seekPublicationId: text("seek_publication_id"),
    offerPublicationId: text("offer_publication_id"),
    query: text("query").notNull(),
    score: doublePrecision("score"),
    explanation: jsonb("explanation").$type<{ why: string; commonalities?: string[] }>(),
    status: text("status").$type<MatchStatus>().notNull(),
    evidence: jsonb("evidence").$type<TrustEvidence>().notNull(),
    receiptId: text("receipt_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("matches_requester_idx").on(t.requesterEntityId),
    index("matches_candidate_idx").on(t.candidateEntityId),
  ],
);

export const receipts = pgTable(
  "receipts",
  {
    id: text("id").primaryKey(),
    matchId: text("match_id"),
    actorEntityId: text("actor_entity_id").notNull(),
    counterpartyEntityId: text("counterparty_entity_id").notNull(),
    actionType: text("action_type").$type<ActionType>().notNull(),
    status: text("status").$type<ReceiptStatus>().notNull(),
    outcome: jsonb("outcome").$type<Record<string, unknown>>().notNull(),
    evidence: jsonb("evidence").$type<TrustEvidence>().notNull(),
    task: text("task"),
    would: text("would"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("receipts_match_idx").on(t.matchId), index("receipts_actor_idx").on(t.actorEntityId)],
);

export const matchMessages = pgTable(
  "match_messages",
  {
    id: text("id").primaryKey(),
    matchId: text("match_id").notNull(),
    fromEntityId: text("from_entity_id").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("match_messages_match_idx").on(t.matchId)],
);

export const reputations = pgTable("reputations", {
  entityId: text("entity_id").primaryKey(),
  completionReliability: doublePrecision("completion_reliability").notNull(),
  responseRate: doublePrecision("response_rate").notNull(),
  acceptanceRate: doublePrecision("acceptance_rate").notNull(),
  failureRate: doublePrecision("failure_rate").notNull(),
  verifiedSuccesses: integer("verified_successes").notNull(),
  proposed: integer("proposed").notNull(),
  accepted: integer("accepted").notNull(),
  declined: integer("declined").notNull(),
  started: integer("started").notNull(),
  completed: integer("completed").notNull(),
  failed: integer("failed").notNull(),
  cancelled: integer("cancelled").notNull(),
  evidenceReceiptIds: jsonb("evidence_receipt_ids").$type<string[]>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});
