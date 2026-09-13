#!/usr/bin/env npx tsx
/**
 * Apply WhoElse SQL migrations to DATABASE_URL (Neon).
 *   vercel env pull .env.local --yes
 *   set -a && source .env.local && set +a
 *   pnpm db:migrate
 */
import { applyMigrations, neonClient } from "../src/persist/client.ts";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required. Run `vercel env pull .env.local` and source it.");
  process.exit(1);
}

const client = neonClient(url);
await applyMigrations(client);
console.log("whoelse schema applied (idempotent).");
