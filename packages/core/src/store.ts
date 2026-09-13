import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  Entity,
  FeedbackEvent,
  InterestRecord,
  InvokeReceipt,
  MatchRecord,
  NetworkStats,
  Relation,
  TrustEvidence,
} from "./types.js";
import { uniqueStrings } from "./text.js";

export function findSeedPath(): string {
  if (process.env.WHOELSE_SEED_PATH) return process.env.WHOELSE_SEED_PATH;

  const here = path.dirname(fileURLToPath(import.meta.url));
  const nearby = [
    path.join(here, "../../../data/seed.json"),
    path.join(here, "../../data/seed.json"),
    path.join(here, "../data/seed.json"),
    path.join(process.cwd(), "data/seed.json"),
  ];
  for (const candidate of nearby) {
    if (existsSync(candidate)) return candidate;
  }

  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    const candidate = path.join(dir, "data", "seed.json");
    if (existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("Could not find data/seed.json. Set WHOELSE_SEED_PATH.");
}

export function offersOf(entity: Entity): string[] {
  return unique([...(entity.offers ?? []), ...(entity.capabilities ?? [])]);
}

export function seeksOf(entity: Entity): string[] {
  const looking = uniqueStrings(entity.attributes?.lookingFor);
  const wants = entity.preferences?.wantsMoreOf;
  const extra = typeof wants === "string" ? [wants] : uniqueStrings(wants);
  return unique([...(entity.seeks ?? []), ...looking, ...extra]);
}

export function normalizeEntity(raw: Entity): Entity {
  const offers = offersOf(raw);
  const seeks = seeksOf(raw);
  return {
    ...raw,
    offers,
    seeks,
    capabilities: offers,
    attributes: raw.attributes ?? {},
    preferences: raw.preferences ?? {},
    metadata: raw.metadata ?? {},
    trust: raw.trust ?? {
      status: "unscored",
      provenance: raw.provenance,
    },
  };
}

export class EntityStore {
  readonly entities: Entity[];
  readonly byId: Map<string, Entity>;
  readonly feedback: FeedbackEvent[] = [];
  readonly interests: InterestRecord[] = [];
  readonly matches: MatchRecord[] = [];
  readonly receipts: InvokeReceipt[] = [];
  readonly missingSupply: { query: string; view?: string }[] = [];

  constructor(entities: Entity[]) {
    this.entities = entities.map(normalizeEntity);
    this.byId = new Map(this.entities.map((e) => [e.id, e]));
  }

  static fromSeed(seedPath = findSeedPath()): EntityStore {
    const raw = JSON.parse(readFileSync(seedPath, "utf8")) as { entities: Entity[] };
    if (!Array.isArray(raw.entities)) {
      throw new Error("seed.json must contain an entities array");
    }
    return new EntityStore(raw.entities);
  }

  get(id: string): Entity | undefined {
    return this.byId.get(id);
  }

  all(): Entity[] {
    return this.entities;
  }

  add(entity: Entity): Entity {
    const next = normalizeEntity(entity);
    const existing = this.byId.get(next.id);
    if (existing) {
      const idx = this.entities.findIndex((e) => e.id === next.id);
      if (idx >= 0) this.entities[idx] = next;
      this.byId.set(next.id, next);
      return next;
    }
    this.entities.push(next);
    this.byId.set(next.id, next);
    return next;
  }

  recordMatch(partial: Omit<MatchRecord, "id" | "created_at" | "updated_at" | "evidence"> & {
    id?: string;
    evidence?: TrustEvidence;
    created_at?: string;
  }): MatchRecord {
    const now = new Date().toISOString();
    const full: MatchRecord = {
      id: partial.id ?? `match-${this.matches.length + 1}-${Math.random().toString(36).slice(2, 8)}`,
      query: partial.query,
      seekEntityId: partial.seekEntityId,
      offerEntityId: partial.offerEntityId,
      side: partial.side,
      evidence: partial.evidence ?? {},
      status: partial.status,
      created_at: partial.created_at ?? now,
      updated_at: now,
      receiptId: partial.receiptId,
    };
    this.matches.push(full);
    return full;
  }

  updateMatch(id: string, patch: Partial<Pick<MatchRecord, "status" | "evidence" | "receiptId">>): MatchRecord | undefined {
    const found = this.matches.find((m) => m.id === id);
    if (!found) return undefined;
    Object.assign(found, patch, { updated_at: new Date().toISOString() });
    return found;
  }

  recordReceipt(partial: Omit<InvokeReceipt, "id" | "at"> & { id?: string; at?: string }): InvokeReceipt {
    const full: InvokeReceipt = {
      ...partial,
      id: partial.id ?? `receipt-${this.receipts.length + 1}-${Math.random().toString(36).slice(2, 8)}`,
      at: partial.at ?? new Date().toISOString(),
    };
    this.receipts.push(full);
    const offer = this.get(full.toAgentId);
    if (offer) {
      const evidence = offer.trust?.evidence ?? {};
      evidence.receipts = [...(evidence.receipts ?? []), full.id];
      offer.trust = { ...(offer.trust ?? { status: "evidence" }), status: "evidence", evidence };
    }
    return full;
  }

  recordMissing(query: string, view?: string) {
    this.missingSupply.push({ query, view });
  }

  stats(): NetworkStats {
    let offers = 0;
    let seeks = 0;
    for (const e of this.entities) {
      if (offersOf(e).length) offers += 1;
      if (seeksOf(e).length) seeks += 1;
    }
    const invoked = this.matches.filter((m) => m.status === "invoked" || m.status === "verified").length;
    const unmatched = Math.max(0, seeks - this.matches.length);
    return {
      entities: this.entities.length,
      offers,
      seeks,
      matches: this.matches.length,
      unmatched,
      invoked,
      missingSupply: this.missingSupply.slice(-12),
    };
  }

  cities(): string[] {
    return [
      ...new Set(
        this.entities
          .map((e) => e.location?.city)
          .filter((c): c is string => Boolean(c)),
      ),
    ];
  }

  /** Neighborhoods plus their city, for generic "near X" parsing. */
  places(): { neighborhood: string; city?: string; region?: string }[] {
    const seen = new Set<string>();
    const out: { neighborhood: string; city?: string; region?: string }[] = [];
    for (const e of this.entities) {
      const n = e.attributes?.neighborhood;
      if (typeof n !== "string" || !n.trim()) continue;
      const key = n.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ neighborhood: n, city: e.location?.city, region: e.location?.region });
    }
    return out;
  }

  recordFeedback(event: Omit<FeedbackEvent, "at"> & { at?: string }): FeedbackEvent {
    const full: FeedbackEvent = { ...event, at: event.at ?? new Date().toISOString() };
    this.feedback.push(full);
    return full;
  }

  recordInterest(record: Omit<InterestRecord, "at"> & { at?: string }): InterestRecord {
    const full: InterestRecord = { ...record, at: record.at ?? new Date().toISOString() };
    this.interests.push(full);
    return full;
  }

  feedbackScore(entityId: string, query = ""): number {
    let score = 0;
    for (const event of this.feedback) {
      if (event.entityId !== entityId) continue;
      const sameQuery = event.query && query && event.query === query;
      const weight = sameQuery ? 0.18 : 0.08;
      score += event.signal === "more" ? weight : -weight;
    }
    return Math.max(-0.4, Math.min(0.4, score));
  }
}

export function entityText(entity: Entity): string {
  const chunks = [
    entity.name,
    entity.type,
    typeWords(entity.type),
    entity.description,
    JSON.stringify(entity.attributes),
    offersOf(entity).join(" "),
    seeksOf(entity).join(" "),
    JSON.stringify(entity.preferences),
    entity.availability ?? "",
    entity.location?.city ?? "",
    entity.location?.region ?? "",
    entity.location?.country ?? "",
  ];
  return chunks.join(" ");
}

export function stringList(entity: Entity, ...keys: string[]): string[] {
  const out: string[] = [];
  const bags = [entity.attributes, entity.preferences];
  for (const bag of bags) {
    for (const key of keys) {
      const value = bag[key];
      if (Array.isArray(value)) out.push(...value.map(String));
      else if (typeof value === "string") out.push(value);
    }
  }
  out.push(...offersOf(entity), ...seeksOf(entity));
  return unique(out);
}

function typeWords(type: string): string {
  if (type === "ai") return "AI artificial intelligence agent bot persona";
  if (type === "agent") return "agent bot service capability worker";
  if (type === "human") return "human people";
  if (type === "company") return "company employer organization";
  if (type === "service") return "service provider";
  if (type === "resource") return "resource listing opening";
  return type;
}

export function relationsOf(entity: Entity): Relation[] {
  const out: Relation[] = [];
  const owner = entity.attributes?.owner;
  if (typeof owner === "string" && owner) {
    out.push({ kind: "owner", from: entity.id, to: owner });
  }
  const fallback = entity.attributes?.fallbackTo;
  if (typeof fallback === "string" && fallback) {
    out.push({ kind: "fallback", from: entity.id, to: fallback });
  }
  return out;
}

export function endpointOf(entity: Entity): { protocol: "http" | "mcp" | "stub"; url: string; auth?: string } | undefined {
  const url = entity.attributes?.apiEndpoint ?? entity.attributes?.endpoint;
  if (!url) return undefined;
  return {
    protocol: entity.attributes?.mcpEndpoint ? "mcp" : "http",
    url: String(url),
    auth: entity.attributes?.authRequirements ? String(entity.attributes.authRequirements) : undefined,
  };
}

export function stateOf(entity: Entity): string | undefined {
  const state = entity.attributes?.state;
  return typeof state === "string" && state ? state : undefined;
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((s) => s.trim()).filter(Boolean))];
}
