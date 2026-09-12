import { buildExplanation, labelsOf } from "./explain.js";
import { inferConstraints, inferMode, queryText } from "./parse.js";
import { maybeChat, maybeRerankAndExplain } from "./openai.js";
import { entityText, EntityStore, offersOf, seeksOf, stringList } from "./store.js";
import { jaccard } from "./text.js";
import { TfidfIndex } from "./tfidf.js";
import type {
  Candidate,
  ChatMessage,
  Entity,
  ScoreBreakdown,
  WhoElseMode,
  WhoElseRequest,
  WhoElseResult,
} from "./types.js";

const TEXT_W = 0.5;
const STRUCT_W = 0.28;
const LOC_W = 0.14;
const TYPE_W = 0.08;
const EXEMPLAR_STRUCT_W = 0.4;
const EXEMPLAR_TEXT_W = 0.38;

export class WhoElseEngine {
  constructor(
    readonly store: EntityStore,
    private readonly index: TfidfIndex,
  ) {}

  static fromSeed(seedPath?: string): WhoElseEngine {
    const store = EntityStore.fromSeed(seedPath);
    const index = new TfidfIndex();
    for (const entity of store.all()) index.add(entity.id, entityText(entity));
    return new WhoElseEngine(store, index);
  }

  whoelse(request: WhoElseRequest): WhoElseResult {
    const contextEntity = request.entityId ? this.store.get(request.entityId) : undefined;
    const rawQuery = queryText({
      context: request.context,
      predicate: request.predicate,
      entity: contextEntity,
    });
    const inferredMode = inferMode(rawQuery, Boolean(contextEntity), request.mode);
    const inferredConstraints = inferConstraints(
      rawQuery,
      this.store.cities(),
      request.constraints,
    );
    const exclude = new Set(request.exclude ?? []);
    if (contextEntity) exclude.add(contextEntity.id);

    const qVec = this.index.query(rawQuery);
    const queryLabels = [
      ...(inferredConstraints.interests ?? []),
      ...(inferredConstraints.capabilities ?? []),
      ...(inferredConstraints.offers ?? []),
      ...(inferredConstraints.seeks ?? []),
      ...labelsOf(contextEntity ?? emptyEntity(request.context)),
    ];

    const scored: Candidate[] = [];
    for (const entity of this.store.all()) {
      if (exclude.has(entity.id)) continue;
      if (inferredConstraints.type && entity.type !== inferredConstraints.type) continue;
      if (!passesGeo(entity, inferredConstraints)) continue;
      if (inferredConstraints.interests?.length) {
        const have = labelsOf(entity).map((s) => s.toLowerCase());
        const need = inferredConstraints.interests.map((s) => s.toLowerCase());
        if (!need.some((n) => have.some((h) => h.includes(n) || n.includes(h)))) continue;
      }

      const text = this.index.similarity(entity.id, qVec);
      const structured = structuredScore(entity, contextEntity, queryLabels, inferredMode);
      const location = locationScore(entity, inferredConstraints, contextEntity);
      const typeAffinity = typeScore(entity, inferredMode, contextEntity);
      const feedback = this.store.feedbackScore(entity.id, request.context);
      const textW = contextEntity ? EXEMPLAR_TEXT_W : TEXT_W;
      const structW = contextEntity ? EXEMPLAR_STRUCT_W : STRUCT_W;
      const total =
        textW * text +
        structW * structured +
        LOC_W * location +
        TYPE_W * typeAffinity +
        feedback;

      const sharedTerms = this.index.topTerms(entity.id, rawQuery);
      const breakdown: ScoreBreakdown = {
        text,
        structured,
        location,
        feedback,
        total,
      };
      const narrative = buildExplanation({
        entity,
        contextEntity,
        query: rawQuery,
        sharedTerms,
        locationMatch: location > 0,
      });
      scored.push({
        entity,
        score: total,
        explanation: { ...narrative, scoreBreakdown: breakdown },
      });
    }

    scored.sort((a, b) => b.score - a.score);
    const limit = request.limit ?? request.constraints?.limit ?? 8;
    const top = scored.slice(0, Math.max(limit, 8));
    return finish(request.context, inferredMode, inferredConstraints, false, top.slice(0, limit));
  }

  async whoelseAsync(request: WhoElseRequest): Promise<WhoElseResult> {
    const local = this.whoelse({ ...request, limit: Math.max(request.limit ?? 8, 12) });
    const reranked = await maybeRerankAndExplain(request.context, local.candidates);
    const limit = request.limit ?? request.constraints?.limit ?? 8;
    return finish(
      request.context,
      local.inferredMode,
      local.inferredConstraints,
      reranked.used,
      reranked.candidates.slice(0, limit),
    );
  }

  explain(entityId: string, context: string, entityContextId?: string): Candidate | undefined {
    const result = this.whoelse({
      context,
      entityId: entityContextId,
      limit: this.store.all().length,
    });
    return result.candidates.find((c) => c.entity.id === entityId);
  }

  moreLike(entityId: string, opts: { exclude?: string[]; mode?: WhoElseMode; limit?: number } = {}) {
    const entity = this.store.get(entityId);
    if (!entity) throw new Error(`Unknown entity ${entityId}`);
    return this.whoelse({
      context: `Who else like ${entity.name}?`,
      entityId,
      exclude: opts.exclude,
      mode: opts.mode ?? "expand",
      limit: opts.limit ?? 8,
    });
  }

  feedback(entityId: string, signal: "more" | "less", query?: string) {
    if (!this.store.get(entityId)) throw new Error(`Unknown entity ${entityId}`);
    return this.store.recordFeedback({ entityId, signal, query });
  }

  recordHumanInterest(entityId: string, note?: string) {
    const entity = this.store.get(entityId);
    if (!entity) throw new Error(`Unknown entity ${entityId}`);
    if (entity.type !== "human") throw new Error("Interest is only recorded for humans");
    return this.store.recordInterest({ entityId, note });
  }

  async chat(entityId: string, messages: ChatMessage[]): Promise<{
    entityId: string;
    disclosure: string;
    reply: string;
    stub: boolean;
  }> {
    const entity = this.store.get(entityId);
    if (!entity) throw new Error(`Unknown entity ${entityId}`);
    if (entity.type !== "ai" && entity.type !== "agent") {
      throw new Error("Chat stub is only available for clearly labeled AIs and agents");
    }
    const last = messages.at(-1)?.content ?? "hello";
    const llm = await maybeChat(
      {
        name: entity.name,
        description: entity.description,
        capabilities: offersOf(entity),
      },
      messages,
    );
    const reply =
      llm ??
      stubChat(entity, last);
    return {
      entityId,
      disclosure: `${entity.name} is an AI, not a human.`,
      reply,
      stub: !llm,
    };
  }
}

function structuredScore(
  entity: Entity,
  contextEntity: Entity | undefined,
  queryLabels: string[],
  mode: WhoElseMode,
): number {
  const self = labelsOf(entity);
  const target = contextEntity ? labelsOf(contextEntity) : queryLabels;
  const overlap = jaccard(self, target);
  const selfOffers = offersOf(entity);
  const selfSeeks = seeksOf(entity);
  const targetOffers = contextEntity ? offersOf(contextEntity) : queryLabels;
  const targetSeeks = contextEntity ? seeksOf(contextEntity) : queryLabels;
  const sameOffers = jaccard(selfOffers, targetOffers);
  const sameSeeks = jaccard(selfSeeks, targetSeeks);
  const complement = Math.max(jaccard(selfOffers, targetSeeks), jaccard(selfSeeks, targetOffers));
  let score = 0.4 * overlap + 0.2 * sameSeeks + 0.15 * sameOffers + 0.25 * complement;
  if (mode === "peers" && contextEntity && entity.type === contextEntity.type) score += 0.08;
  if (mode === "substitute" && contextEntity) {
    const sameSlot = jaccard(
      stringList(entity, "occupation", "persona"),
      stringList(contextEntity, "occupation", "persona"),
    );
    score = 0.45 * Math.max(sameSlot, sameOffers) + 0.55 * score;
  }
  return Math.max(0, Math.min(1, score));
}

function locationScore(
  entity: Entity,
  constraints: { city?: string; region?: string },
  contextEntity?: Entity,
): number {
  const city = constraints.city ?? contextEntity?.location?.city;
  const region = constraints.region ?? contextEntity?.location?.region;
  if (!entity.location) return 0;
  if (city && eq(entity.location.city, city)) return 1;
  if (region && eq(entity.location.region, region)) return 0.55;
  return 0;
}

function typeScore(entity: Entity, mode: WhoElseMode, contextEntity?: Entity): number {
  if (mode === "peers" && contextEntity) return entity.type === contextEntity.type ? 1 : 0.15;
  if (mode === "substitute" && contextEntity) return entity.type === contextEntity.type ? 0.8 : 1;
  return 0.5;
}

function isMachineType(type: string): boolean {
  return type === "ai" || type === "agent" || type === "service";
}

function passesGeo(
  entity: Entity,
  constraints: { city?: string; region?: string; country?: string },
): boolean {
  if (constraints.city && entity.location?.city && !eq(entity.location.city, constraints.city)) {
    if (isMachineType(entity.type) || entity.attributes.remote === true) return true;
    return false;
  }
  if (constraints.country && entity.location?.country && !eq(entity.location.country, constraints.country)) {
    return isMachineType(entity.type);
  }
  return true;
}

function eq(a?: string, b?: string): boolean {
  return (a ?? "").toLowerCase() === (b ?? "").toLowerCase();
}

function finish(
  query: string,
  inferredMode: WhoElseMode,
  inferredConstraints: WhoElseResult["inferredConstraints"],
  usedOpenAiRerank: boolean,
  candidates: Candidate[],
): WhoElseResult {
  return {
    query,
    inferredMode,
    inferredConstraints,
    usedOpenAiRerank,
    candidates,
    humans: candidates.filter((c) => c.entity.type === "human"),
    ais: candidates.filter((c) => c.entity.type === "ai"),
    byType: groupByType(candidates),
  };
}

function groupByType(candidates: Candidate[]): Record<string, Candidate[]> {
  const out: Record<string, Candidate[]> = {};
  for (const c of candidates) {
    (out[c.entity.type] ??= []).push(c);
  }
  return out;
}

function emptyEntity(context: string): Entity {
  return {
    id: "query",
    type: "human",
    name: "query",
    description: context,
    attributes: {},
    offers: [],
    seeks: [context],
    capabilities: [],
    preferences: {},
    metadata: {},
    provenance: "user",
    created_at: new Date().toISOString(),
  };
}

function stubChat(entity: Entity, last: string): string {
  const skill = offersOf(entity)[0] ?? "conversation";
  return `${entity.name} here — I'm an AI, not a person. You said “${trim(last)}.” I can help with ${skill}. This is a local chat stub; set OPENAI_API_KEY for a richer persona.`;
}

function trim(text: string): string {
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
}
