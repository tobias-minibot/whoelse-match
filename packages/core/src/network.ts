import type { Caller } from "./authz.js";
import { WhoElseEngine } from "./engine.js";
import { IdentityLedger } from "./identity.js";
import type { PostgresRepository } from "./persist/repository.js";
import { RateLimiter } from "./rate-limit.js";
import type { SeedMode } from "./seed-policy.js";
import type { Entity } from "./types.js";
import { UsageLog } from "./usage.js";

export class WhoElseNetwork {
  readonly rateLimit: RateLimiter;
  readonly usage: UsageLog;

  constructor(
    readonly engine: WhoElseEngine,
    readonly identity: IdentityLedger,
    readonly persist: PostgresRepository | null,
    readonly seedMode: SeedMode,
    rateLimit?: RateLimiter,
  ) {
    this.rateLimit = rateLimit ?? new RateLimiter(persist);
    this.usage = new UsageLog();
  }

  static memory(engine: WhoElseEngine, identity: IdentityLedger, seedMode: SeedMode = "demo"): WhoElseNetwork {
    return new WhoElseNetwork(engine, identity, null, seedMode);
  }

  static fromSeed(seedPath?: string): WhoElseNetwork {
    const engine = WhoElseEngine.fromSeed(seedPath);
    const identity = IdentityLedger.forSyntheticSeed(engine.store.all().map((e) => e.id));
    return new WhoElseNetwork(engine, identity, null, "demo");
  }

  static fromEntities(entities: Entity[], identity?: IdentityLedger): WhoElseNetwork {
    const engine = WhoElseEngine.fromEntities(entities);
    return new WhoElseNetwork(
      engine,
      identity ?? IdentityLedger.forSyntheticSeed(entities.map((e) => e.id)),
      null,
      entities.length ? "demo" : "empty",
    );
  }

  authenticateAgentKey(token: string | undefined | null): Caller | null {
    if (!token) return null;
    return this.identity.authenticateAgentKey(token);
  }
}
