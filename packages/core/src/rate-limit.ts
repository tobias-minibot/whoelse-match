/**
 * Write / anonymous-read counters. Durable on Postgres (Neon) so Vercel
 * instances share a budget. Memory fallback for tests and local-empty.
 * No Upstash — those env names are not provisioned.
 */

import type { PostgresRepository } from "./persist/repository.js";

export const RATE_ACTIONS = [
  "register",
  "publish",
  "withdraw",
  "feedback",
  "onboard",
  "affirm",
  "read",
] as const;

export type RateAction = (typeof RATE_ACTIONS)[number];

export interface RateSpec {
  max: number;
  windowSec: number;
}

export type RateLimits = Record<RateAction, RateSpec>;

/** Launch-safe defaults. Tight enough to stop spray, loose enough to dogfood. */
export const DEFAULT_RATE_LIMITS: RateLimits = {
  register: { max: 8, windowSec: 3600 },
  publish: { max: 30, windowSec: 3600 },
  withdraw: { max: 30, windowSec: 3600 },
  feedback: { max: 40, windowSec: 3600 },
  onboard: { max: 8, windowSec: 3600 },
  affirm: { max: 10, windowSec: 3600 },
  /** Anonymous find / entity GET, per IP. Cheap extra. */
  read: { max: 90, windowSec: 60 },
};

export interface RateHit {
  ok: boolean;
  action: RateAction;
  count: number;
  limit: number;
  bucket: string;
}

export function alignWindow(nowMs: number, windowSec: number): Date {
  const ms = windowSec * 1000;
  return new Date(Math.floor(nowMs / ms) * ms);
}

export function principalBucket(principalId: string, action: RateAction): string {
  return `principal:${principalId}:${action}`;
}

export function ipBucket(ip: string, action: RateAction): string {
  return `ip:${ip}:${action}`;
}

export class RateLimiter {
  readonly limits: RateLimits;
  private readonly memory = new Map<string, { windowStart: number; count: number }>();

  constructor(
    private readonly repo: PostgresRepository | null = null,
    overrides?: Partial<RateLimits>,
  ) {
    this.limits = { ...DEFAULT_RATE_LIMITS, ...overrides };
  }

  async hit(action: RateAction, bucket: string, now = Date.now()): Promise<RateHit> {
    const spec = this.limits[action];
    const windowStart = alignWindow(now, spec.windowSec);
    if (this.repo) {
      const count = await this.repo.incrementRate(bucket, windowStart, spec.windowSec);
      return { ok: count <= spec.max, action, count, limit: spec.max, bucket };
    }
    const key = `${bucket}:${windowStart.toISOString()}`;
    const startMs = windowStart.getTime();
    const prior = this.memory.get(key);
    const count = (prior && prior.windowStart === startMs ? prior.count : 0) + 1;
    this.memory.set(key, { windowStart: startMs, count });
    return { ok: count <= spec.max, action, count, limit: spec.max, bucket };
  }
}
