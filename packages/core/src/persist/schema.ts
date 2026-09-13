import { boolean, index, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { AgentScope } from "../authz.js";
import type { Entity, Publication } from "../types.js";

export const principals = pgTable("principals", {
  id: text("id").primaryKey(),
  kind: text("kind").$type<"human" | "agent">().notNull(),
  displayName: text("display_name"),
  clerkUserId: text("clerk_user_id"),
  synthetic: boolean("synthetic").notNull().default(false),
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
