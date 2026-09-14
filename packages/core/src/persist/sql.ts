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

/** Closed network loop: MATCH / RECEIPT / REPUTATION / threaded messages. */
export const LOOP_SQL = `
CREATE TABLE IF NOT EXISTS matches (
  id text PRIMARY KEY,
  requester_entity_id text NOT NULL,
  candidate_entity_id text NOT NULL,
  seek_entity_id text,
  offer_entity_id text,
  seek_publication_id text,
  offer_publication_id text,
  query text NOT NULL,
  score double precision,
  explanation jsonb,
  status text NOT NULL CHECK (status IN ('proposed', 'accepted', 'declined', 'invoked', 'completed', 'cancelled', 'expired', 'verified')),
  evidence jsonb NOT NULL DEFAULT '{}',
  receipt_id text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS receipts (
  id text PRIMARY KEY,
  match_id text,
  actor_entity_id text NOT NULL,
  counterparty_entity_id text NOT NULL,
  action_type text NOT NULL,
  status text NOT NULL CHECK (status IN ('proposed', 'accepted', 'declined', 'started', 'completed', 'failed', 'cancelled')),
  outcome jsonb NOT NULL DEFAULT '{}',
  evidence jsonb NOT NULL DEFAULT '{}',
  task text,
  would text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS match_messages (
  id text PRIMARY KEY,
  match_id text NOT NULL,
  from_entity_id text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS reputations (
  entity_id text PRIMARY KEY,
  completion_reliability double precision NOT NULL DEFAULT 0,
  response_rate double precision NOT NULL DEFAULT 0,
  acceptance_rate double precision NOT NULL DEFAULT 0,
  failure_rate double precision NOT NULL DEFAULT 0,
  verified_successes integer NOT NULL DEFAULT 0,
  proposed integer NOT NULL DEFAULT 0,
  accepted integer NOT NULL DEFAULT 0,
  declined integer NOT NULL DEFAULT 0,
  started integer NOT NULL DEFAULT 0,
  completed integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  cancelled integer NOT NULL DEFAULT 0,
  evidence_receipt_ids jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS matches_requester_idx ON matches (requester_entity_id);
CREATE INDEX IF NOT EXISTS matches_candidate_idx ON matches (candidate_entity_id);
CREATE INDEX IF NOT EXISTS matches_status_idx ON matches (status);
CREATE UNIQUE INDEX IF NOT EXISTS matches_seek_offer_pub_idx
  ON matches (seek_publication_id, offer_publication_id)
  WHERE seek_publication_id IS NOT NULL AND offer_publication_id IS NOT NULL
    AND status IN ('proposed', 'accepted', 'invoked');
CREATE INDEX IF NOT EXISTS receipts_match_idx ON receipts (match_id);
CREATE INDEX IF NOT EXISTS receipts_actor_idx ON receipts (actor_entity_id);
CREATE INDEX IF NOT EXISTS receipts_counterparty_idx ON receipts (counterparty_entity_id);
CREATE INDEX IF NOT EXISTS match_messages_match_idx ON match_messages (match_id);
`;

/** First-party usage events. Counts only — not vanity metrics. */
export const ANALYTICS_SQL = `
CREATE TABLE IF NOT EXISTS usage_events (
  id text PRIMARY KEY,
  name text NOT NULL,
  at timestamptz NOT NULL,
  principal_id text,
  payload jsonb
);

CREATE INDEX IF NOT EXISTS usage_events_name_at_idx ON usage_events (name, at DESC);
`;

export const MIGRATION_FILES = [
  { id: "0000_init", sql: INIT_SQL },
  { id: "0001_onboarding", sql: ONBOARDING_SQL },
  { id: "0002_loop", sql: LOOP_SQL },
  { id: "0003_analytics", sql: ANALYTICS_SQL },
] as const;
