#!/usr/bin/env npx tsx
/**
 * Load labeled synthetic seed.json into Postgres. Never the production default.
 *   WHOELSE_SEED=demo pnpm db:seed
 */
import { seedDemo } from "../src/boot.ts";
import { applyMigrations, neonClient } from "../src/persist/client.ts";
import { PostgresRepository } from "../src/persist/repository.ts";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required. Run `vercel env pull .env.local` and source it.");
  process.exit(1);
}

const client = neonClient(url);
await applyMigrations(client);
const repo = new PostgresRepository(client);
await seedDemo(repo);
console.log("labeled synthetic demo seed written. Set WHOELSE_SEED=demo to load it on boot.");
