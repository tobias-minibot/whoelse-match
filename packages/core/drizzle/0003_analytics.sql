-- First-party usage events. Idempotent. Applied by boot + `pnpm db:migrate`.
CREATE TABLE IF NOT EXISTS usage_events (
  id text PRIMARY KEY,
  name text NOT NULL,
  at timestamptz NOT NULL,
  principal_id text,
  payload jsonb
);

CREATE INDEX IF NOT EXISTS usage_events_name_at_idx ON usage_events (name, at DESC);
