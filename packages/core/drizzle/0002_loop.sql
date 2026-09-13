-- Closed network loop. Idempotent. Applied by boot + `pnpm db:migrate`.
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
