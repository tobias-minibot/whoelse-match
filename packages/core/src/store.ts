import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { computeReputation, emptyReputation, NETWORK_REPUTATION_ISSUER } from "./reputation.js";
import type {
  ActionType,
  Entity,
  FeedbackEvent,
  InterestRecord,
  InvokeReceipt,
  MatchRecord,
  MatchStatus,
  NetworkStats,
  Publication,
  PublicationSpec,
  ReceiptStatus,
  Relation,
  ReputationRecord,
  ThreadMessage,
  TrustEvidence,
} from "./types.js";
import {
  bagsFromPublications,
  hydratePublications,
  normalizePublication,
  upsertPublications,
} from "./publications.js";
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
  const looking = uniqueStrings(raw.attributes?.lookingFor);
  const wants = raw.preferences?.wantsMoreOf;
  const extra = typeof wants === "string" ? [wants] : uniqueStrings(wants);
  const withBags: Entity = {
    ...raw,
    offers: unique([...(raw.offers ?? []), ...(raw.capabilities ?? [])]),
    seeks: unique([...(raw.seeks ?? []), ...looking, ...extra]),
  };
  const publications = hydratePublications(withBags);
  const bags = bagsFromPublications(publications);
  const offers = unique([...bags.offers, ...withBags.offers]);
  const seeks = unique([...bags.seeks, ...withBags.seeks]);
  return {
    ...raw,
    publications,
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
  readonly publications: Publication[] = [];
  readonly publicationsById = new Map<string, Publication>();
  readonly feedback: FeedbackEvent[] = [];
  readonly interests: InterestRecord[] = [];
  readonly matches: MatchRecord[] = [];
  readonly receipts: InvokeReceipt[] = [];
  readonly messages: ThreadMessage[] = [];
  readonly reputations = new Map<string, ReputationRecord>();
  readonly missingSupply: { query: string; view?: string }[] = [];

  constructor(entities: Entity[]) {
    this.entities = entities.map(normalizeEntity);
    this.byId = new Map(this.entities.map((e) => [e.id, e]));
    this.reindexPublications();
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
      this.reindexPublications();
      return next;
    }
    this.entities.push(next);
    this.byId.set(next.id, next);
    this.reindexPublications();
    return next;
  }

  publish(entityId: string, specs: PublicationSpec[]): Entity {
    const entity = this.get(entityId);
    if (!entity) throw new Error(`Unknown entity ${entityId}`);
    if (!specs.length) throw new Error("publish requires at least one offer or seek");
    const now = new Date().toISOString();
    const incoming = specs.map((spec) => normalizePublication({ ...spec, entityId }, now));
    const publications = upsertPublications(entity.publications ?? [], incoming);
    const bags = bagsFromPublications(publications);
    return this.add({
      ...entity,
      publications,
      offers: bags.offers,
      seeks: bags.seeks,
      capabilities: bags.offers,
    });
  }

  publication(id: string): Publication | undefined {
    return this.publicationsById.get(id);
  }

  private reindexPublications() {
    this.publications.length = 0;
    this.publicationsById.clear();
    for (const e of this.entities) {
      for (const p of e.publications ?? []) {
        this.publications.push(p);
        this.publicationsById.set(p.id, p);
      }
    }
  }

  match(id: string): MatchRecord | undefined {
    return this.matches.find((m) => m.id === id);
  }

  findOpenPair(opts: {
    requesterEntityId: string;
    candidateEntityId: string;
    seekPublicationId?: string;
    offerPublicationId?: string;
  }): MatchRecord | undefined {
    return this.matches.find((m) => {
      if (m.requesterEntityId !== opts.requesterEntityId || m.candidateEntityId !== opts.candidateEntityId) {
        return false;
      }
      if ((opts.seekPublicationId || m.seekPublicationId) && m.seekPublicationId !== opts.seekPublicationId) {
        return false;
      }
      if ((opts.offerPublicationId || m.offerPublicationId) && m.offerPublicationId !== opts.offerPublicationId) {
        return false;
      }
      return m.status === "proposed" || m.status === "accepted" || m.status === "invoked";
    });
  }

  recordMatch(
    partial: Omit<MatchRecord, "id" | "created_at" | "updated_at" | "evidence" | "requesterEntityId" | "candidateEntityId"> & {
      id?: string;
      evidence?: TrustEvidence;
      created_at?: string;
      requesterEntityId?: string;
      candidateEntityId?: string;
    },
  ): MatchRecord {
    const now = new Date().toISOString();
    const requesterEntityId = partial.requesterEntityId ?? partial.seekEntityId ?? "";
    const candidateEntityId = partial.candidateEntityId ?? partial.offerEntityId ?? "";
    if (!requesterEntityId || !candidateEntityId) {
      throw new Error("match requires requesterEntityId and candidateEntityId");
    }
    const existing = this.findOpenPair({
      requesterEntityId,
      candidateEntityId,
      seekPublicationId: partial.seekPublicationId,
      offerPublicationId: partial.offerPublicationId,
    });
    if (existing && !partial.id) return existing;
    const full: MatchRecord = {
      id: partial.id ?? `match-${this.matches.length + 1}-${Math.random().toString(36).slice(2, 8)}`,
      query: partial.query,
      requesterEntityId,
      candidateEntityId,
      seekEntityId: partial.seekEntityId ?? requesterEntityId,
      offerEntityId: partial.offerEntityId ?? candidateEntityId,
      offerPublicationId: partial.offerPublicationId,
      seekPublicationId: partial.seekPublicationId,
      side: partial.side,
      score: partial.score,
      explanation: partial.explanation,
      evidence: partial.evidence ?? {},
      status: partial.status,
      created_at: partial.created_at ?? now,
      updated_at: now,
      receiptId: partial.receiptId,
    };
    this.matches.push(full);
    return full;
  }

  hasPublicationPair(offerPublicationId: string, seekPublicationId: string): boolean {
    return this.matches.some(
      (m) => m.offerPublicationId === offerPublicationId && m.seekPublicationId === seekPublicationId,
    );
  }

  updateMatch(
    id: string,
    patch: Partial<Pick<MatchRecord, "status" | "evidence" | "receiptId" | "score" | "explanation">>,
  ): MatchRecord | undefined {
    const found = this.matches.find((m) => m.id === id);
    if (!found) return undefined;
    Object.assign(found, patch, { updated_at: new Date().toISOString() });
    return found;
  }

  recordReceipt(
    partial: Partial<InvokeReceipt> & {
      toAgentId?: string;
      task?: string;
      would?: string;
      result?: Record<string, unknown>;
      evidence?: TrustEvidence;
      id?: string;
      at?: string;
    },
  ): InvokeReceipt {
    const now = new Date().toISOString();
    const actorEntityId = partial.actorEntityId ?? partial.fromAgentId ?? "";
    const counterpartyEntityId = partial.counterpartyEntityId ?? partial.toAgentId ?? "";
    if (!counterpartyEntityId) throw new Error("receipt requires a counterparty");
    const actionType: ActionType = partial.actionType ?? "invoke";
    const status: ReceiptStatus = partial.status ?? "completed";
    const outcome = partial.outcome ?? partial.result ?? {};
    const full: InvokeReceipt = {
      id: partial.id ?? `receipt-${this.receipts.length + 1}-${Math.random().toString(36).slice(2, 8)}`,
      matchId: partial.matchId,
      actorEntityId: actorEntityId || counterpartyEntityId,
      counterpartyEntityId,
      actionType,
      status,
      outcome,
      fromAgentId: partial.fromAgentId ?? (actorEntityId || undefined),
      toAgentId: counterpartyEntityId,
      task: partial.task ?? (typeof outcome.task === "string" ? outcome.task : actionType),
      would: partial.would ?? (typeof outcome.would === "string" ? outcome.would : `${actionType} → ${status}`),
      result: partial.result ?? outcome,
      evidence: partial.evidence ?? {},
      at: partial.at ?? now,
      updated_at: now,
    };
    this.receipts.push(full);
    if (full.matchId) {
      const nextStatus = matchStatusFromReceipt(full);
      this.updateMatch(full.matchId, nextStatus ? { receiptId: full.id, status: nextStatus } : { receiptId: full.id });
    }
    this.applyReceiptToTrust(full);
    this.recomputeReputation(full.actorEntityId);
    if (full.counterpartyEntityId !== full.actorEntityId) {
      this.recomputeReputation(full.counterpartyEntityId);
    }
    return full;
  }

  recordMessage(partial: Omit<ThreadMessage, "id" | "created_at"> & { id?: string; created_at?: string }): ThreadMessage {
    const full: ThreadMessage = {
      id: partial.id ?? `msg-${this.messages.length + 1}-${Math.random().toString(36).slice(2, 8)}`,
      matchId: partial.matchId,
      fromEntityId: partial.fromEntityId,
      body: partial.body,
      created_at: partial.created_at ?? new Date().toISOString(),
    };
    this.messages.push(full);
    return full;
  }

  messagesFor(matchId: string): ThreadMessage[] {
    return this.messages.filter((m) => m.matchId === matchId);
  }

  receiptsFor(opts: { matchId?: string; entityId?: string }): InvokeReceipt[] {
    return this.receipts.filter((r) => {
      if (opts.matchId && r.matchId !== opts.matchId) return false;
      if (
        opts.entityId &&
        r.actorEntityId !== opts.entityId &&
        r.counterpartyEntityId !== opts.entityId &&
        r.fromAgentId !== opts.entityId &&
        r.toAgentId !== opts.entityId
      ) {
        return false;
      }
      return true;
    });
  }

  reputationOf(entityId: string): ReputationRecord {
    return this.reputations.get(entityId) ?? emptyReputation(entityId);
  }

  recomputeReputation(entityId: string): ReputationRecord {
    const rec = computeReputation(entityId, this.receipts);
    this.reputations.set(entityId, rec);
    this.stampReputationEvidence(entityId, rec);
    return rec;
  }

  hydrateLoop(input: {
    matches?: MatchRecord[];
    receipts?: InvokeReceipt[];
    messages?: ThreadMessage[];
    reputations?: ReputationRecord[];
  }): void {
    if (input.matches?.length) this.matches.push(...input.matches);
    if (input.receipts?.length) this.receipts.push(...input.receipts);
    if (input.messages?.length) this.messages.push(...input.messages);
    const entityIds = new Set<string>();
    for (const r of this.receipts) {
      entityIds.add(r.actorEntityId);
      entityIds.add(r.counterpartyEntityId);
    }
    for (const id of entityIds) {
      if (id) this.recomputeReputation(id);
    }
    for (const rec of input.reputations ?? []) {
      if (!this.reputations.has(rec.entityId)) this.reputations.set(rec.entityId, rec);
    }
  }

  private applyReceiptToTrust(receipt: InvokeReceipt) {
    for (const id of [receipt.counterpartyEntityId, receipt.actorEntityId]) {
      const entity = this.get(id);
      if (!entity) continue;
      const evidence = entity.trust?.evidence ?? {};
      evidence.receipts = [...new Set([...(evidence.receipts ?? []), receipt.id])];
      entity.trust = { ...(entity.trust ?? { status: "evidence" }), status: "evidence", evidence };
    }
  }

  private stampReputationEvidence(entityId: string, rec: ReputationRecord) {
    const entity = this.get(entityId);
    if (!entity) return;
    const evidence = { ...(entity.trust?.evidence ?? {}) };
    evidence.receipts = [...rec.evidenceReceiptIds];
    evidence.outcomes = [
      ...(evidence.outcomes ?? []).filter((o) => !o.label.startsWith("network.")),
      { label: "network.completionReliability", result: rec.completionReliability.toFixed(4) },
      { label: "network.verifiedSuccesses", result: String(rec.verifiedSuccesses) },
    ];
    if (rec.verifiedSuccesses > 0) {
      evidence.verified = true;
      evidence.verifiedBy = NETWORK_REPUTATION_ISSUER;
    }
    entity.trust = {
      ...(entity.trust ?? { status: "evidence" }),
      status: rec.evidenceReceiptIds.length ? "evidence" : entity.trust?.status ?? "unscored",
      notes: rec.evidenceReceiptIds.length
        ? "Network reputation from receipts — issued by whoelse-network, not self-asserted."
        : entity.trust?.notes,
      evidence,
    };
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
    const offerRecords = this.publications.filter((p) => p.kind === "offer").length;
    const seekRecords = this.publications.filter((p) => p.kind === "seek").length;
    const invoked = this.matches.filter((m) => m.status === "invoked" || m.status === "verified").length;
    const unmatched = Math.max(0, seekRecords - this.matches.length);
    return {
      entities: this.entities.length,
      offers,
      seeks,
      offerRecords,
      seekRecords,
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

function matchStatusFromReceipt(receipt: InvokeReceipt): MatchStatus | undefined {
  if (receipt.actionType === "accept" || receipt.status === "accepted") return "accepted";
  if (receipt.actionType === "decline" || receipt.status === "declined") return "declined";
  if (receipt.actionType === "cancel" || receipt.status === "cancelled") return "cancelled";
  if (receipt.status === "completed") {
    if (receipt.evidence?.verified || receipt.result?.kind === "verify") return "verified";
    return "completed";
  }
  if (
    (receipt.actionType === "invoke" || receipt.actionType === "delegate" || receipt.actionType === "handoff") &&
    (receipt.status === "started" || receipt.status === "failed")
  ) {
    return "invoked";
  }
  return undefined;
}
