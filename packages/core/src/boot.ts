import { WhoElseEngine } from "./engine.js";
import { AGENT_SCOPES } from "./authz.js";
import { DEMO_INTRUDER_KEY_ID, DEMO_OWNER_KEY_ID, IdentityLedger } from "./identity.js";
import { WhoElseNetwork } from "./network.js";
import { getNeonClient } from "./persist/client.js";
import { PostgresRepository } from "./persist/repository.js";
import { resolveSeedMode, type SeedMode } from "./seed-policy.js";
import { EntityStore, findSeedPath, normalizeEntity } from "./store.js";
import type { Entity } from "./types.js";
import { readFileSync } from "node:fs";

export interface BootOptions {
  env?: NodeJS.ProcessEnv;
  persist?: PostgresRepository | null;
  seedPath?: string;
  /** When set, skip env detection and use this mode. */
  seedMode?: SeedMode;
}

function loadSeedEntities(seedPath?: string): Entity[] {
  const path = seedPath ?? findSeedPath();
  const raw = JSON.parse(readFileSync(path, "utf8")) as { entities: Entity[] };
  if (!Array.isArray(raw.entities)) throw new Error("seed.json must contain an entities array");
  return raw.entities.map(normalizeEntity);
}

export async function seedDemo(repo: PostgresRepository, seedPath?: string): Promise<void> {
  const entities = loadSeedEntities(seedPath);
  const identity = IdentityLedger.forSyntheticSeed(entities.map((e) => e.id));
  for (const p of identity.principals.values()) await repo.upsertPrincipal(p);
  for (const a of identity.accounts.values()) await repo.upsertAccount(a);
  for (const c of identity.credentials.values()) await repo.upsertCredential(c);
  for (const entity of entities) {
    await repo.upsertEntity(entity, identity.ownersOf(entity.id)[0]!);
  }
  for (const row of identity.ownership) await repo.upsertOwnership(row);
}

export async function bootNetwork(opts: BootOptions = {}): Promise<WhoElseNetwork> {
  const env = opts.env ?? process.env;
  const seedMode = opts.seedMode ?? resolveSeedMode(env);
  const persist =
    opts.persist === undefined
      ? (() => {
          const client = getNeonClient(env);
          return client ? new PostgresRepository(client) : null;
        })()
      : opts.persist;

  if (persist) {
    await persist.migrate();
    if (seedMode === "demo") {
      const count = await persist.entityCount();
      if (count === 0) await seedDemo(persist, opts.seedPath);
    }
    const entities = await persist.loadEntities();
    const identity = IdentityLedger.fromSnapshot(await persist.loadIdentity());
    for (const keyId of [DEMO_OWNER_KEY_ID, DEMO_INTRUDER_KEY_ID]) {
      const cred = identity.credentials.get(keyId);
      if (cred) cred.scopes = [...AGENT_SCOPES];
    }
    const store = new EntityStore(entities);
    try {
      store.hydrateLoop(await persist.loadLoop());
    } catch {
      // Pre-loop DBs get tables on migrate(); empty loop is fine.
    }
    const engine = WhoElseEngine.fromStore(store);
    if (seedMode === "demo") engine.ensureDemoAgents();
    return new WhoElseNetwork(engine, identity, persist, seedMode);
  }

  if (seedMode === "demo") {
    const engine = WhoElseEngine.fromSeed(opts.seedPath);
    engine.ensureDemoAgents();
    const identity = IdentityLedger.forSyntheticSeed(engine.store.all().map((e) => e.id));
    return new WhoElseNetwork(engine, identity, null, seedMode);
  }

  return new WhoElseNetwork(WhoElseEngine.fromEntities([]), IdentityLedger.empty(), null, "empty");
}
