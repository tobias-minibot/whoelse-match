import type { Account, AgentCredential, Ownership, Principal, WriteAudit } from "../authz.js";
import type { IdentitySnapshot } from "../identity.js";
import { hydratePublications } from "../publications.js";
import type { Entity, Publication } from "../types.js";
import type { SqlClient } from "./client.js";
import { applyMigrations } from "./client.js";

function asIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return new Date().toISOString();
}

function asBool(value: unknown): boolean {
  return value === true || value === "t" || value === "true";
}

function asJson<T>(value: unknown): T {
  if (typeof value === "string") return JSON.parse(value) as T;
  return value as T;
}

export class PostgresRepository {
  constructor(readonly client: SqlClient) {}

  async migrate(): Promise<void> {
    await applyMigrations(this.client);
  }

  async loadEntities(): Promise<Entity[]> {
    const rows = await this.client.query<{ id: string; body: unknown }>("SELECT id, body FROM entities");
    const pubs = await this.client.query<{ entity_id: string; body: unknown }>(
      "SELECT entity_id, body FROM publications",
    );
    const byEntity = new Map<string, Publication[]>();
    for (const row of pubs) {
      const pub = asJson<Publication>(row.body);
      const list = byEntity.get(row.entity_id) ?? [];
      list.push(pub);
      byEntity.set(row.entity_id, list);
    }
    return rows.map((row) => {
      const entity = asJson<Entity>(row.body);
      entity.publications = byEntity.get(row.id) ?? entity.publications ?? [];
      entity.publications = hydratePublications(entity);
      return entity;
    });
  }

  async loadIdentity(): Promise<IdentitySnapshot> {
    const principalRows = await this.client.query<Record<string, unknown>>("SELECT * FROM principals");
    const accountRows = await this.client.query<Record<string, unknown>>("SELECT * FROM accounts");
    const credRows = await this.client.query<Record<string, unknown>>("SELECT * FROM agent_credentials");
    const ownRows = await this.client.query<Record<string, unknown>>("SELECT * FROM ownership");
    const auditRows = await this.client.query<Record<string, unknown>>("SELECT * FROM write_audit ORDER BY at ASC");
    return {
      principals: principalRows.map(
        (r): Principal => ({
          id: String(r.id),
          kind: r.kind === "human" ? "human" : "agent",
          displayName: r.display_name ? String(r.display_name) : undefined,
          clerkUserId: r.clerk_user_id ? String(r.clerk_user_id) : undefined,
          synthetic: asBool(r.synthetic),
          ageAffirmedAt: r.age_affirmed_at ? asIso(r.age_affirmed_at) : undefined,
          ageAffirmationVersion: r.age_affirmation_version ? String(r.age_affirmation_version) : undefined,
          created_at: asIso(r.created_at),
          updated_at: asIso(r.updated_at),
        }),
      ),
      accounts: accountRows.map(
        (r): Account => ({
          id: String(r.id),
          principalId: String(r.principal_id),
          clerkUserId: String(r.clerk_user_id),
          created_at: asIso(r.created_at),
        }),
      ),
      credentials: credRows.map(
        (r): AgentCredential => ({
          id: String(r.id),
          principalId: String(r.principal_id),
          keyId: String(r.key_id),
          keyHash: String(r.key_hash),
          scopes: asJson(r.scopes),
          created_at: asIso(r.created_at),
          rotated_at: r.rotated_at ? asIso(r.rotated_at) : undefined,
          revoked_at: r.revoked_at ? asIso(r.revoked_at) : undefined,
          last_used_at: r.last_used_at ? asIso(r.last_used_at) : undefined,
        }),
      ),
      ownership: ownRows.map(
        (r): Ownership => ({
          entityId: String(r.entity_id),
          principalId: String(r.principal_id),
          role: r.role === "delegate" ? "delegate" : "owner",
          created_at: asIso(r.created_at),
        }),
      ),
      audit: auditRows.map(
        (r): WriteAudit => ({
          id: String(r.id),
          at: asIso(r.at),
          principalId: r.principal_id ? String(r.principal_id) : undefined,
          action: String(r.action),
          entityId: r.entity_id ? String(r.entity_id) : undefined,
          publicationId: r.publication_id ? String(r.publication_id) : undefined,
          payload: r.payload ? asJson(r.payload) : undefined,
        }),
      ),
    };
  }

  async upsertPrincipal(p: Principal): Promise<void> {
    await this.client.query(
      `INSERT INTO principals (id, kind, display_name, clerk_user_id, synthetic, age_affirmed_at, age_affirmation_version, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7, $8::timestamptz, $9::timestamptz)
       ON CONFLICT (id) DO UPDATE SET
         kind = EXCLUDED.kind,
         display_name = EXCLUDED.display_name,
         clerk_user_id = EXCLUDED.clerk_user_id,
         synthetic = EXCLUDED.synthetic,
         age_affirmed_at = EXCLUDED.age_affirmed_at,
         age_affirmation_version = EXCLUDED.age_affirmation_version,
         updated_at = EXCLUDED.updated_at`,
      [
        p.id,
        p.kind,
        p.displayName ?? null,
        p.clerkUserId ?? null,
        p.synthetic === true,
        p.ageAffirmedAt ?? null,
        p.ageAffirmationVersion ?? null,
        p.created_at,
        p.updated_at,
      ],
    );
  }

  async upsertAccount(a: Account): Promise<void> {
    await this.client.query(
      `INSERT INTO accounts (id, principal_id, clerk_user_id, created_at)
       VALUES ($1, $2, $3, $4::timestamptz)
       ON CONFLICT (id) DO UPDATE SET clerk_user_id = EXCLUDED.clerk_user_id, principal_id = EXCLUDED.principal_id`,
      [a.id, a.principalId, a.clerkUserId, a.created_at],
    );
  }

  async upsertCredential(c: AgentCredential): Promise<void> {
    await this.client.query(
      `INSERT INTO agent_credentials (id, principal_id, key_id, key_hash, scopes, created_at, rotated_at, revoked_at, last_used_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::timestamptz, $7::timestamptz, $8::timestamptz, $9::timestamptz)
       ON CONFLICT (id) DO UPDATE SET
         key_hash = EXCLUDED.key_hash,
         scopes = EXCLUDED.scopes,
         rotated_at = EXCLUDED.rotated_at,
         revoked_at = EXCLUDED.revoked_at,
         last_used_at = EXCLUDED.last_used_at`,
      [
        c.id,
        c.principalId,
        c.keyId,
        c.keyHash,
        JSON.stringify(c.scopes),
        c.created_at,
        c.rotated_at ?? null,
        c.revoked_at ?? null,
        c.last_used_at ?? null,
      ],
    );
  }

  async upsertEntity(entity: Entity, ownerPrincipalId: string): Promise<void> {
    const body = { ...entity };
    await this.client.query(
      `INSERT INTO entities (id, owner_principal_id, type, name, description, body, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::timestamptz, $8::timestamptz)
       ON CONFLICT (id) DO UPDATE SET
         owner_principal_id = EXCLUDED.owner_principal_id,
         type = EXCLUDED.type,
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         body = EXCLUDED.body,
         updated_at = EXCLUDED.updated_at`,
      [
        entity.id,
        ownerPrincipalId,
        entity.type,
        entity.name,
        entity.description,
        JSON.stringify(body),
        entity.created_at,
        new Date().toISOString(),
      ],
    );
    for (const pub of entity.publications ?? []) {
      await this.upsertPublication(pub);
    }
  }

  async upsertPublication(p: Publication): Promise<void> {
    await this.client.query(
      `INSERT INTO publications (id, entity_id, kind, capability, status, body, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::timestamptz, $8::timestamptz)
       ON CONFLICT (entity_id, kind, capability) DO UPDATE SET
         id = EXCLUDED.id,
         status = EXCLUDED.status,
         body = EXCLUDED.body,
         updated_at = EXCLUDED.updated_at`,
      [
        p.id,
        p.entityId,
        p.kind,
        p.capability,
        p.status ?? "active",
        JSON.stringify(p),
        p.created_at,
        p.updated_at,
      ],
    );
  }

  async upsertOwnership(row: Ownership): Promise<void> {
    await this.client.query(
      `INSERT INTO ownership (entity_id, principal_id, role, created_at)
       VALUES ($1, $2, $3, $4::timestamptz)
       ON CONFLICT (entity_id, principal_id) DO UPDATE SET role = EXCLUDED.role`,
      [row.entityId, row.principalId, row.role, row.created_at],
    );
  }

  async appendAudit(a: WriteAudit): Promise<void> {
    await this.client.query(
      `INSERT INTO write_audit (id, at, principal_id, action, entity_id, publication_id, payload)
       VALUES ($1, $2::timestamptz, $3, $4, $5, $6, $7::jsonb)
       ON CONFLICT (id) DO NOTHING`,
      [a.id, a.at, a.principalId ?? null, a.action, a.entityId ?? null, a.publicationId ?? null, JSON.stringify(a.payload ?? {})],
    );
  }

  async entityCount(): Promise<number> {
    const rows = await this.client.query<{ n: string | number }>("SELECT count(*)::int AS n FROM entities");
    return Number(rows[0]?.n ?? 0);
  }

  async incrementRate(bucket: string, windowStart: Date, _windowSec: number): Promise<number> {
    const start = windowStart.toISOString();
    const rows = await this.client.query<{ count: string | number }>(
      `INSERT INTO rate_counters (bucket, window_start, count)
       VALUES ($1, $2::timestamptz, 1)
       ON CONFLICT (bucket) DO UPDATE SET
         count = CASE
           WHEN rate_counters.window_start < EXCLUDED.window_start THEN 1
           ELSE rate_counters.count + 1
         END,
         window_start = CASE
           WHEN rate_counters.window_start < EXCLUDED.window_start THEN EXCLUDED.window_start
           ELSE rate_counters.window_start
         END
       RETURNING count`,
      [bucket, start],
    );
    return Number(rows[0]?.count ?? 1);
  }
}
