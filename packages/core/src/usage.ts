export const USAGE_NAMES = [
  "signup",
  "onboard",
  "find",
  "match_propose",
  "act",
  "receipt",
  "compile",
] as const;

export type UsageName = (typeof USAGE_NAMES)[number];

export interface UsageEvent {
  id: string;
  name: UsageName;
  at: string;
  principalId?: string;
  payload?: Record<string, unknown>;
}

export interface UsageSummary {
  counts: Record<UsageName, number>;
  recent: UsageEvent[];
  total: number;
}

const RING = 200;

export class UsageLog {
  readonly events: UsageEvent[] = [];

  record(event: Omit<UsageEvent, "id" | "at"> & { id?: string; at?: string }): UsageEvent {
    const full: UsageEvent = {
      id: event.id ?? `use-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name: event.name,
      at: event.at ?? new Date().toISOString(),
      principalId: event.principalId,
      payload: event.payload,
    };
    this.events.push(full);
    if (this.events.length > RING) this.events.splice(0, this.events.length - RING);
    return full;
  }

  summarize(limit = 20): UsageSummary {
    const counts = emptyCounts();
    for (const e of this.events) counts[e.name] += 1;
    return {
      counts,
      recent: this.events.slice(-limit).reverse(),
      total: this.events.length,
    };
  }
}

export function emptyCounts(): Record<UsageName, number> {
  return {
    signup: 0,
    onboard: 0,
    find: 0,
    match_propose: 0,
    act: 0,
    receipt: 0,
    compile: 0,
  };
}

export function isUsageName(value: string): value is UsageName {
  return (USAGE_NAMES as readonly string[]).includes(value);
}
