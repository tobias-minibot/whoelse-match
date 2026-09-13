/** Idempotent Postgres schema. Applied on first connect and by `pnpm db:migrate`. */
export const INIT_SQL = `
CREATE TABLE IF NOT EXISTS principals (
  id text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('human', 'agent')),
  display_name text,
  clerk_user_id text UNIQUE,
  synthetic boolean NOT NULL DEFAULT false,
  age_affirmed_at timestamptz,
  age_affirmation_version text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id text PRIMARY KEY,
  principal_id text NOT NULL REFERENCES principals(id) ON DELETE CASCADE,
  clerk_user_id text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_credentials (
  id text PRIMARY KEY,
  principal_id text NOT NULL REFERENCES principals(id) ON DELETE CASCADE,
  key_id text NOT NULL UNIQUE,
  key_hash text NOT NULL,
  scopes jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  rotated_at timestamptz,
  revoked_at timestamptz,
  last_used_at timestamptz
);

CREATE TABLE IF NOT EXISTS entities (
  id text PRIMARY KEY,
  owner_principal_id text NOT NULL REFERENCES principals(id),
  type text NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  body jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS ownership (
  entity_id text NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  principal_id text NOT NULL REFERENCES principals(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'delegate')),
  created_at timestamptz NOT NULL,
  PRIMARY KEY (entity_id, principal_id)
);

CREATE TABLE IF NOT EXISTS publications (
  id text PRIMARY KEY,
  entity_id text NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('offer', 'seek')),
  capability text NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'withdrawn', 'expired')),
  body jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  UNIQUE (entity_id, kind, capability)
);

CREATE TABLE IF NOT EXISTS write_audit (
  id text PRIMARY KEY,
  at timestamptz NOT NULL,
  principal_id text,
  action text NOT NULL,
  entity_id text,
  publication_id text,
  payload jsonb
);

CREATE INDEX IF NOT EXISTS entities_owner_idx ON entities (owner_principal_id);
CREATE INDEX IF NOT EXISTS publications_entity_idx ON publications (entity_id);
CREATE INDEX IF NOT EXISTS publications_live_idx ON publications (status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS write_audit_at_idx ON write_audit (at);
CREATE INDEX IF NOT EXISTS agent_credentials_principal_idx ON agent_credentials (principal_id);
`;

/** Additive. Safe on DBs that already ran 0000_init. */
export const ONBOARDING_SQL = `
ALTER TABLE principals ADD COLUMN IF NOT EXISTS age_affirmed_at timestamptz;
ALTER TABLE principals ADD COLUMN IF NOT EXISTS age_affirmation_version text;

CREATE TABLE IF NOT EXISTS rate_counters (
  bucket text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  count integer NOT NULL
);
`;

export const MIGRATION_FILES = [
  { id: "0000_init", sql: INIT_SQL },
  { id: "0001_onboarding", sql: ONBOARDING_SQL },
] as const;
