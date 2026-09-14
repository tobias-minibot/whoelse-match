import { WhoElseEngine } from "./engine.js";
import type { WhoElseNetwork } from "./network.js";
import type { WhoElseRequest, WhoElseResult } from "./types.js";

/** Live network vs labeled demo corpus. Never mix the two in one result set. */
export type DiscoveryPool = "live" | "playground";

export interface PooledFind {
  result: WhoElseResult;
  pool: DiscoveryPool;
  /** Hits from the live engine before any playground fallback. */
  liveHits: number;
}

let playgroundSingleton: WhoElseEngine | undefined;

export function resetPlaygroundForTests(): void {
  playgroundSingleton = undefined;
}

/** In-memory labeled seed. Never written to Neon / production principals. */
export function getPlaygroundEngine(): WhoElseEngine {
  if (!playgroundSingleton) {
    playgroundSingleton = WhoElseEngine.fromSeed();
    playgroundSingleton.ensureDemoAgents();
  }
  return playgroundSingleton;
}

export function hasUsefulMatches(result: WhoElseResult): boolean {
  return result.candidates.length > 0;
}

function stamp(result: WhoElseResult, pool: DiscoveryPool): WhoElseResult {
  return { ...result, pool };
}

function livePoolLabel(network: WhoElseNetwork): DiscoveryPool {
  return network.seedMode === "demo" ? "playground" : "live";
}

/**
 * Prefer live matches. If the live pool has nothing useful, search the
 * labeled playground corpus. Recursive Who else? on a playground entity
 * stays in playground. Never concatenates the two lists.
 */
export async function findPreferLive(
  live: WhoElseNetwork,
  request: WhoElseRequest,
  playground: WhoElseEngine = getPlaygroundEngine(),
): Promise<PooledFind> {
  const liveEngine = live.engine;
  const entityId = request.entityId;

  if (entityId) {
    if (liveEngine.store.get(entityId)) {
      const result = await liveEngine.whoelseAsync(request);
      const pool = livePoolLabel(live);
      return { result: stamp(result, pool), pool, liveHits: result.candidates.length };
    }
    if (playground.store.get(entityId)) {
      const result = await playground.whoelseAsync(request);
      return { result: stamp(result, "playground"), pool: "playground", liveHits: 0 };
    }
  }

  if (request.matchId) {
    const result = await liveEngine.whoelseAsync(request);
    const pool = livePoolLabel(live);
    return { result: stamp(result, pool), pool, liveHits: result.candidates.length };
  }

  if (live.seedMode === "demo") {
    const result = await liveEngine.whoelseAsync(request);
    return { result: stamp(result, "playground"), pool: "playground", liveHits: 0 };
  }

  const liveResult = await liveEngine.whoelseAsync(request);
  if (hasUsefulMatches(liveResult)) {
    return { result: stamp(liveResult, "live"), pool: "live", liveHits: liveResult.candidates.length };
  }

  const playResult = await playground.whoelseAsync(request);
  return { result: stamp(playResult, "playground"), pool: "playground", liveHits: 0 };
}
