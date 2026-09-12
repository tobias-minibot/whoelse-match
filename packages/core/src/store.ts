import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Entity, FeedbackEvent, InterestRecord } from "./types.js";
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

  cities(): string[] {
    return [
      ...new Set(
        this.entities
          .map((e) => e.location?.city)
          .filter((c): c is string => Boolean(c)),
      ),
    ];
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
  return type;
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((s) => s.trim()).filter(Boolean))];
}
