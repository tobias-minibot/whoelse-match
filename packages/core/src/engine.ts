import { buildExplanation, labelsOf } from "./explain.js";
import { invokeAgent } from "./invoke.js";
import { inferConstraints, inferMode, inferVertical, parseUniversal, queryText, wantsCheaper } from "./parse.js";
import { maybeChat, maybeRerankAndExplain } from "./openai.js";
import { entityText, EntityStore, offersOf, seeksOf, stringList } from "./store.js";
import { jaccard } from "./text.js";
import { TfidfIndex } from "./tfidf.js";
import { explainTrust } from "./trust.js";
import type {
  AttributeConstraint,
  Candidate,
  ChatMessage,
  DelegationResult,
  Entity,
  MatchRecord,
  MatchSide,
  RegistrationSpec,
  ScoreBreakdown,
  UniversalQuery,
  WhoElseConstraints,
  WhoElseMode,
  WhoElseRequest,
  WhoElseResult,
} from "./types.js";
import { OFFER_ROLES, SEEK_ROLES } from "./types.js";

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

  static fromEntities(entities: Entity[]): WhoElseEngine {
    return WhoElseEngine.fromStore(new EntityStore(entities));
  }

  static fromStore(store: EntityStore): WhoElseEngine {
    const index = new TfidfIndex();
    for (const entity of store.all()) index.add(entity.id, entityText(entity));
    return new WhoElseEngine(store, index);
  }

  static fromSeed(seedPath?: string): WhoElseEngine {
    return WhoElseEngine.fromStore(EntityStore.fromSeed(seedPath));
  }

  whoelse(request: WhoElseRequest): WhoElseResult {
    const contextEntity = request.entityId ? this.store.get(request.entityId) : undefined;
    const userText = [request.context, request.predicate ?? ""].filter(Boolean).join(" ");
    const rawQuery = queryText({
      context: request.context,
      predicate: request.predicate,
      entity: contextEntity,
    });
    const inferredMode = inferMode(userText, Boolean(contextEntity), request.mode);
    const universal = parseUniversal(
      userText,
      this.store.cities(),
      request.constraints,
      this.store.places(),
      { hasEntity: Boolean(contextEntity), mode: request.mode },
    );
    const inferredConstraints = inferConstraints(
      userText,
      this.store.cities(),
      request.constraints,
      this.store.places(),
    );
    inheritExemplarFilters(inferredConstraints, userText, contextEntity);
    applyCheaperFromExemplar(inferredConstraints, userText, contextEntity);
    const exclude = new Set([
      ...(request.exclude ?? []),
      ...(request.knownEntities ?? []),
      ...(request.requester ? [request.requester] : []),
    ]);
    if (contextEntity) exclude.add(contextEntity.id);

    const qVec = this.index.query(rawQuery);
    const queryLabels = [
      ...(inferredConstraints.interests ?? []),
      ...(inferredConstraints.capabilities ?? []),
      ...(inferredConstraints.offers ?? []),
      ...(inferredConstraints.seeks ?? []),
      ...labelsOf(contextEntity ?? emptyEntity(request.context, inferredConstraints.side)),
    ];

    const scored: Candidate[] = [];
    for (const entity of this.store.all()) {
      if (exclude.has(entity.id)) continue;
      if (inferredConstraints.type && entity.type !== inferredConstraints.type) continue;
      if (!passesGeo(entity, inferredConstraints)) continue;
      if (request.availability && entity.availability && !softAvail(entity.availability, request.availability)) {
        continue;
      }
      if (request.minTrust && request.minTrust !== "any") {
        const status = entity.trust?.status ?? "unscored";
        if (request.minTrust === "evidence") {
          if (status !== "evidence" && !entity.trust?.evidence) continue;
        } else if (status !== request.minTrust) {
          continue;
        }
      }
      if (inferredConstraints.interests?.length) {
        const have = labelsOf(entity).map((s) => s.toLowerCase());
        const need = inferredConstraints.interests.map((s) => s.toLowerCase());
        if (!need.some((n) => have.some((h) => h.includes(n) || n.includes(h)))) continue;
      }
      if (!passesSide(entity, inferredConstraints.side)) continue;
      if (!passesRoles(entity, inferredConstraints.roles)) continue;
      if (!passesAttributes(entity, inferredConstraints.attributes)) continue;
      if (!passesNeighborhood(entity, inferredConstraints)) continue;
      if (inferredConstraints.state && !matchState(entity, inferredConstraints.state)) continue;

      const text = this.index.similarity(entity.id, qVec);
      const structured = structuredScore(
        entity,
        contextEntity,
        queryLabels,
        inferredMode,
        inferredConstraints.side,
      );
      const location = locationScore(entity, inferredConstraints, contextEntity);
      const typeAffinity = typeScore(entity, inferredMode, contextEntity);
      const feedback = this.store.feedbackScore(entity.id, request.context);
      const evidence = evidenceScore(entity, rawQuery);
      // Kill the 0.04 type-only floor that filled first-five with random humans.
      // Attribute hits are already relevant — "accepts pets" should not die on TF-IDF.
      const constrained = Boolean(inferredConstraints.attributes?.length);
      if (
        !contextEntity &&
        !constrained &&
        text < 0.03 &&
        structured < 0.05 &&
        location === 0 &&
        feedback === 0 &&
        evidence === 0
      ) {
        continue;
      }
      const textW = contextEntity ? EXEMPLAR_TEXT_W : TEXT_W;
      const structW = contextEntity ? EXEMPLAR_STRUCT_W : STRUCT_W;
      const total =
        textW * text +
        structW * structured +
        LOC_W * location +
        TYPE_W * typeAffinity +
        feedback +
        evidence;

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
    const sliced = top.slice(0, limit);
    if (sliced.length === 0) this.store.recordMissing(request.context, universal.view);
    return finish(
      request.context,
      inferredMode,
      inferredConstraints,
      inferVertical(userText),
      false,
      sliced,
      universal,
    );
  }

  async whoelseAsync(request: WhoElseRequest): Promise<WhoElseResult> {
    const local = this.whoelse({ ...request, limit: Math.max(request.limit ?? 8, 12) });
    const reranked = await maybeRerankAndExplain(request.context, local.candidates);
    const limit = request.limit ?? request.constraints?.limit ?? 8;
    return finish(
      request.context,
      local.inferredMode,
      local.inferredConstraints,
      local.inferredVertical,
      reranked.used,
      reranked.candidates.slice(0, limit),
      local.universal,
    );
  }

  parse(text: string): UniversalQuery {
    return parseUniversal(text, this.store.cities(), undefined, this.store.places());
  }

  register(spec: RegistrationSpec): Entity {
    const slug = spec.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "agent";
    const id = spec.id ?? `agent-reg-${slug}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    const endpoint = spec.endpoint?.url ?? `/api/agents/${id}/invoke`;
    const entity: Entity = {
      id,
      type: spec.type ?? "agent",
      name: spec.name,
      description: spec.description,
      offers: spec.offers,
      seeks: spec.seeks ?? ["work", "who else can use this capability"],
      capabilities: spec.offers,
      attributes: {
        role: spec.type === "human" ? undefined : "worker",
        owner: spec.owner,
        version: spec.version ?? "0.1.0",
        status: spec.status ?? "available",
        protocol: spec.protocol ?? spec.endpoint?.protocol ?? "http",
        requirements: spec.requirements,
        permissions: spec.permissions,
        priceUsd: typeof spec.cost === "number" ? spec.cost : undefined,
        pricing: spec.cost,
        latencyMs: typeof spec.latency === "number" ? spec.latency : undefined,
        latency: spec.latency,
        apiEndpoint: endpoint,
        mcpEndpoint: "/api/mcp",
        endpoint,
        authRequirements: spec.endpoint?.auth ?? "none-demo",
        registered: true,
      },
      preferences: {},
      availability: spec.availability ?? "on request",
      location: spec.location,
      metadata: {
        demo: true,
        demoLabel: "DEMO registered agent — not a production worker",
        aiDisclosure: spec.type === "human" ? undefined : `${spec.name} is a registered agent, not a human.`,
        vertical: "capability",
      },
      provenance: spec.type === "human" ? "user" : "ai_generated",
      trust: {
        status: spec.evidence ? "evidence" : "stub",
        provenance: "user",
        notes: "Registration evidence is self-asserted.",
        evidence: spec.evidence,
      },
      created_at: now,
    };
    const stored = this.store.add(entity);
    this.index.add(stored.id, entityText(stored));
    return stored;
  }

  ensureDemoAgents() {
    if (!this.store.get("agent-claim-writer")) {
      this.register({
        id: "agent-claim-writer",
        name: "ClaimWriter",
        description: "Drafts web claims. Cannot verify them. Seeks a verifier on the same network.",
        offers: ["draft claims", "write web claims"],
        seeks: ["verify this result", "web verification"],
        owner: "whoelse-demo",
        version: "0.1.0",
        cost: 0,
        latency: 40,
        evidence: { outcomes: [{ label: "drafts-only", result: "never-verifies" }] },
      });
    }
  }

  reciprocal(entityId: string, opts: { context?: string; limit?: number } = {}) {
    const entity = this.store.get(entityId);
    if (!entity) throw new Error(`Unknown entity ${entityId}`);
    const role = typeof entity.attributes?.role === "string" ? entity.attributes.role : "";
    const offering = (OFFER_ROLES as readonly string[]).includes(role) || (!role && offersOf(entity).length);
    const context =
      opts.context ??
      (offering
        ? `Who else needs this? ${entity.name}`
        : `Who else has this? ${entity.name}`);
    const side: MatchSide = offering ? "seek" : "offer";
    const result = this.whoelse({
      context,
      entityId,
      constraints: { side },
      limit: opts.limit ?? 5,
    });
    if (result.candidates[0]) {
      this.store.recordMatch({
        query: context,
        seekEntityId: offering ? result.candidates[0].entity.id : entityId,
        offerEntityId: offering ? entityId : result.candidates[0].entity.id,
        side,
        status: "proposed",
        evidence: result.candidates[0].entity.trust?.evidence ?? {},
      });
    }
    return result;
  }

  proposeMatch(opts: {
    query: string;
    offerEntityId?: string;
    seekEntityId?: string;
    side?: MatchSide;
  }): MatchRecord {
    return this.store.recordMatch({
      query: opts.query,
      offerEntityId: opts.offerEntityId,
      seekEntityId: opts.seekEntityId,
      side: opts.side,
      status: "proposed",
      evidence: {},
    });
  }

  trustWhy(entityId: string) {
    const entity = this.store.get(entityId);
    if (!entity) throw new Error(`Unknown entity ${entityId}`);
    return explainTrust(entity);
  }

  invoke(entityId: string, body: { task?: string; input?: string; context?: string } = {}) {
    const entity = this.store.get(entityId);
    if (!entity) throw new Error(`Unknown entity ${entityId}`);
    if (entity.type !== "agent") throw new Error("invoke is only stubbed for type=agent");
    return invokeAgent(entity, body);
  }

  delegate(opts: {
    task: string;
    intent?: string;
    from?: string;
    select?: "first" | "cheapest" | "fastest" | "evidence";
    limit?: number;
  }): DelegationResult {
    const intent = opts.intent ?? opts.task;
    const found = this.whoelse({
      context: intent,
      requester: opts.from,
      limit: opts.limit ?? 8,
    });
    const agents = found.candidates.filter(
      (c) => c.entity.type === "agent" && c.entity.id !== opts.from,
    );
    const selected = pickDelegate(agents, opts.select ?? "first");
    if (!selected) {
      return { ok: false, task: opts.task, intent, from: opts.from, found: found.candidates, reason: "no agent candidate" };
    }
    const invoked = invokeAgent(selected.entity, { task: opts.task });
    const ev = (invoked.result.evidence as {
      verified?: boolean;
      verifiedBy?: string;
      outcomes?: { label: string; result?: string }[];
      receipts?: string[];
    } | undefined) ?? selected.entity.trust?.evidence;
    const receipt = this.store.recordReceipt({
      fromAgentId: opts.from,
      toAgentId: selected.entity.id,
      task: opts.task,
      would: invoked.would,
      result: invoked.result,
      evidence: {
        verified: Boolean(ev?.verified),
        verifiedBy: ev?.verifiedBy ?? selected.entity.name,
        outcomes: ev?.outcomes,
        receipts: ev?.receipts,
      },
    });
    const match = this.store.recordMatch({
      query: intent,
      seekEntityId: opts.from,
      offerEntityId: selected.entity.id,
      side: "offer",
      status: invoked.result.kind === "verify" ? "verified" : "invoked",
      evidence: receipt.evidence,
      receiptId: receipt.id,
    });
    return {
      ok: true,
      task: opts.task,
      intent,
      from: opts.from,
      found: found.candidates,
      selected,
      invoked,
      receipt,
      match,
    };
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
  side?: MatchSide,
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
  const offerToNeed = jaccard(selfOffers, targetSeeks);
  const needToOffer = jaccard(selfSeeks, targetOffers);
  const complement = Math.max(offerToNeed, needToOffer);
  let score = 0.4 * overlap + 0.2 * sameSeeks + 0.15 * sameOffers + 0.25 * complement;
  if (side === "offer") {
    score = 0.28 * overlap + 0.08 * sameSeeks + 0.18 * sameOffers + 0.46 * Math.max(offerToNeed, sameOffers);
  } else if (side === "seek") {
    score = 0.28 * overlap + 0.18 * sameSeeks + 0.08 * sameOffers + 0.46 * Math.max(needToOffer, sameSeeks);
  }
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
  constraints: { city?: string; region?: string; neighborhood?: string },
  contextEntity?: Entity,
): number {
  const city = constraints.city ?? contextEntity?.location?.city;
  const region = constraints.region ?? contextEntity?.location?.region;
  const neighborhood =
    constraints.neighborhood ??
    (typeof contextEntity?.attributes?.neighborhood === "string"
      ? contextEntity.attributes.neighborhood
      : undefined);
  const entityHood =
    typeof entity.attributes?.neighborhood === "string" ? entity.attributes.neighborhood : undefined;
  if (neighborhood && entityHood && eq(neighborhood, entityHood)) return 1;
  if (!entity.location) return neighborhood ? 0 : 0;
  if (city && eq(entity.location.city, city)) return neighborhood ? 0.55 : 1;
  if (region && eq(entity.location.region, region)) return 0.45;
  return 0;
}

function inheritExemplarFilters(
  constraints: WhoElseConstraints,
  userText: string,
  entity?: Entity,
) {
  if (!entity) return;
  if (
    !/\blike this\b|\bsomething like\b|\bthis (apartment|listing|place|one|role|job|ride|gig)\b/i.test(
      userText,
    )
  ) {
    return;
  }
  const a = entity.attributes ?? {};
  const attrs = (constraints.attributes ??= []);
  const add = (key: string, op: AttributeConstraint["op"], value: unknown) => {
    if (value == null || value === "") return;
    if (attrs.some((x) => x.key === key)) return;
    attrs.push({ key, op, value });
  };
  if (typeof a.bedrooms === "number") add("bedrooms", "eq", a.bedrooms);
  if (a.furnished === true) add("furnished", "truthy", true);
  if (a.furnished === false) add("furnished", "eq", false);
  if (typeof a.currency === "string") add("currency", "eq", a.currency);
  if (typeof a.durationWeeks === "number") add("durationWeeks", "eq", a.durationWeeks);
  if (typeof a.origin === "string") add("origin", "includes", a.origin);
  if (typeof a.destination === "string") add("destination", "includes", a.destination);
  if (a.licensed === true) add("licensed", "truthy", true);
  if (!constraints.city && entity.location?.city) constraints.city = entity.location.city;
  if (!constraints.region && entity.location?.region) constraints.region = entity.location.region;
}

function applyCheaperFromExemplar(
  constraints: WhoElseConstraints,
  query: string,
  contextEntity?: Entity,
) {
  if (!contextEntity || !wantsCheaper(query)) return;
  const amount = asNumber(
    contextEntity.attributes?.rent ??
      contextEntity.attributes?.rate ??
      contextEntity.attributes?.price ??
      contextEntity.attributes?.priceUsd,
  );
  if (amount == null) return;
  const attrs = (constraints.attributes ??= []);
  const key =
    contextEntity.attributes?.rate != null
      ? "rate"
      : contextEntity.attributes?.price != null
        ? "price"
        : "rent";
  if (!attrs.some((a) => a.key === key && a.op === "lte")) {
    attrs.push({ key, op: "lte", value: amount - 1 });
  }
}

function passesSide(entity: Entity, side?: MatchSide): boolean {
  if (!side) return true;
  const role = typeof entity.attributes?.role === "string" ? entity.attributes.role : "";
  if (!role) return true;
  if (side === "offer" && (SEEK_ROLES as readonly string[]).includes(role)) return false;
  if (side === "seek" && (OFFER_ROLES as readonly string[]).includes(role)) return false;
  return true;
}

function passesRoles(entity: Entity, roles?: string[]): boolean {
  if (!roles?.length) return true;
  const role = typeof entity.attributes?.role === "string" ? entity.attributes.role : "";
  return roles.includes(role);
}

function matchState(entity: Entity, want: string): boolean {
  const have = entity.attributes?.state;
  if (have == null || have === "") return true;
  return eq(String(have), want);
}

function passesNeighborhood(entity: Entity, constraints: WhoElseConstraints): boolean {
  if (!constraints.neighborhood) return true;
  const have =
    typeof entity.attributes?.neighborhood === "string" ? entity.attributes.neighborhood : "";
  if (!have) return Boolean(constraints.city && eq(entity.location?.city, constraints.city));
  return eq(have, constraints.neighborhood) || Boolean(constraints.city && eq(entity.location?.city, constraints.city));
}

function passesAttributes(entity: Entity, attrs?: AttributeConstraint[]): boolean {
  if (!attrs?.length) return true;
  for (const constraint of attrs) {
    const have = readAttr(entity, constraint.key);
    if (!matchAttribute(have, constraint)) return false;
  }
  return true;
}

const ATTR_ALIASES: Record<string, string[]> = {
  rate: ["rate", "priceUsd", "price"],
  budget: ["budget", "salary"],
  price: ["price", "priceUsd", "rate"],
  salary: ["salary", "budget"],
};

function readAttr(entity: Entity, key: string): unknown {
  const keys = ATTR_ALIASES[key] ?? [key];
  for (const k of keys) {
    const have = entity.attributes?.[k] ?? entity.preferences?.[k];
    if (have != null && have !== "") return have;
  }
  return entity.attributes?.[key] ?? entity.preferences?.[key];
}

function matchAttribute(have: unknown, constraint: AttributeConstraint): boolean {
  if (constraint.op === "neq") {
    if (have == null || have === "") return true;
    return String(have).toLowerCase() !== String(constraint.value).toLowerCase();
  }
  if (constraint.op === "truthy") {
    return have === true || have === "true" || have === "yes";
  }
  if (have == null || have === "") return false;
  if (constraint.op === "eq") {
    if (typeof constraint.value === "boolean") return Boolean(have) === constraint.value;
    const n = asNumber(have);
    const m = asNumber(constraint.value);
    if (n != null && m != null) return n === m;
    return String(have).toLowerCase() === String(constraint.value).toLowerCase();
  }
  if (constraint.op === "lte" || constraint.op === "gte") {
    const n = asNumber(have) ?? (typeof have === "string" && /^\d{4}-\d{2}-\d{2}/.test(have) ? have : undefined);
    const m =
      asNumber(constraint.value) ??
      (typeof constraint.value === "string" && /^\d{4}-\d{2}-\d{2}/.test(constraint.value)
        ? constraint.value
        : undefined);
    if (n == null || m == null) return false;
    return constraint.op === "lte" ? n <= m : n >= m;
  }
  if (constraint.op === "includes") {
    const bag = Array.isArray(have) ? have.map(String) : [String(have)];
    return bag.some((x) => x.toLowerCase().includes(String(constraint.value).toLowerCase()));
  }
  return true;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) return Number(value);
  return undefined;
}

function typeScore(entity: Entity, mode: WhoElseMode, contextEntity?: Entity): number {
  if (mode === "peers" && contextEntity) return entity.type === contextEntity.type ? 1 : 0.15;
  if (mode === "substitute" && contextEntity) return entity.type === contextEntity.type ? 0.8 : 1;
  return 0.5;
}

function isMachineType(type: string): boolean {
  return type === "ai" || type === "agent" || type === "service";
}

function softAvail(have: string, want: string): boolean {
  return have.toLowerCase().includes(want.toLowerCase()) || want.toLowerCase().includes(have.toLowerCase());
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

function evidenceScore(entity: Entity, query: string): number {
  const ev = entity.trust?.evidence;
  if (!ev) return 0;
  const wants = /\b(done this|portfolio|verified|licensed|past (work|outcome)|exact kind)\b/i.test(
    query,
  );
  if (!wants) return ev.verified ? 0.015 : 0;
  let score = 0;
  if (ev.verified) score += 0.08;
  if (ev.outcomes?.length) score += 0.06;
  if (ev.portfolio?.length) score += 0.04;
  if (ev.licenses?.length) score += 0.04;
  return Math.min(0.16, score);
}

function finish(
  query: string,
  inferredMode: WhoElseMode,
  inferredConstraints: WhoElseResult["inferredConstraints"],
  inferredVertical: WhoElseResult["inferredVertical"],
  usedOpenAiRerank: boolean,
  candidates: Candidate[],
  universal?: UniversalQuery,
): WhoElseResult {
  return {
    query,
    inferredMode,
    inferredConstraints,
    inferredVertical,
    inferredView: inferredVertical,
    universal,
    usedOpenAiRerank,
    candidates,
    humans: candidates.filter((c) => c.entity.type === "human"),
    ais: candidates.filter((c) => c.entity.type === "ai"),
    byType: groupByType(candidates),
  };
}

function pickDelegate(candidates: Candidate[], select: "first" | "cheapest" | "fastest" | "evidence"): Candidate | undefined {
  if (!candidates.length) return undefined;
  if (select === "first") return candidates[0];
  const scored = [...candidates];
  if (select === "cheapest") {
    scored.sort((a, b) => num(a.entity.attributes?.priceUsd ?? a.entity.attributes?.rate, 9999) - num(b.entity.attributes?.priceUsd ?? b.entity.attributes?.rate, 9999));
  } else if (select === "fastest") {
    scored.sort((a, b) => num(a.entity.attributes?.latencyMs, 9999) - num(b.entity.attributes?.latencyMs, 9999));
  } else if (select === "evidence") {
    scored.sort((a, b) => evidenceRank(b.entity) - evidenceRank(a.entity));
  }
  return scored[0];
}

function evidenceRank(entity: Entity): number {
  const ev = entity.trust?.evidence;
  if (!ev) return 0;
  return (ev.verified ? 4 : 0) + (ev.outcomes?.length ?? 0) + (ev.licenses?.length ?? 0) + (ev.portfolio?.length ?? 0);
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && !Number.isNaN(value) ? value : fallback;
}

function groupByType(candidates: Candidate[]): Record<string, Candidate[]> {
  const out: Record<string, Candidate[]> = {};
  for (const c of candidates) {
    (out[c.entity.type] ??= []).push(c);
  }
  return out;
}

function emptyEntity(context: string, side?: MatchSide): Entity {
  const asOffer = side === "seek";
  return {
    id: "query",
    type: "human",
    name: "query",
    description: context,
    attributes: {},
    offers: asOffer ? [context] : [],
    seeks: asOffer ? [] : [context],
    capabilities: asOffer ? [context] : [],
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
