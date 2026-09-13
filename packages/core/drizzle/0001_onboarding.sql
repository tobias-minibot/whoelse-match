-- Human onboarding + launch safety. Idempotent. Applied by boot + `pnpm db:migrate`.
ALTER TABLE principals ADD COLUMN IF NOT EXISTS age_affirmed_at timestamptz;
ALTER TABLE principals ADD COLUMN IF NOT EXISTS age_affirmation_version text;

CREATE TABLE IF NOT EXISTS rate_counters (
  bucket text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  count integer NOT NULL
);
