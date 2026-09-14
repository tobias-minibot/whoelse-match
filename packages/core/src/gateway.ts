import {
  AuthzError,
  requireCaller,
  requireScope,
  assertRegisterType,
  type Caller,
} from "./authz.js";
import { WhoElseEngine } from "./engine.js";
import type { IssuedAgentKey } from "./identity.js";
import type { WhoElseNetwork } from "./network.js";
import {
  DEFAULT_HUMAN_SEEK,
  onboardState,
  ownedHumanEntity,
  parseOnboardPublications,
  requireHumanCaller,
  stampHumanLabels,
  type OnboardSpec,
} from "./onboarding.js";
import {
  toOwnerEntity,
  toPublicEntity,
  toPublicMatch,
  toPublicMessage,
  toPublicReceipt,
  toPublicReputation,
  toPublicWhoElseResult,
} from "./public-dto.js";
import { ipBucket, principalBucket, type RateAction } from "./rate-limit.js";
import { compileAsync, type CompileOptions } from "./compile.js";
import { findPreferLive } from "./playground.js";
import type { ActionType, PublicationSpec, ReceiptStatus, RegistrationSpec, WhoElseRequest } from "./types.js";
import type { UsageEvent, UsageName } from "./usage.js";
import {
  AGE_AFFIRMATION_TEXT,
  AGE_AFFIRMATION_VERSION,
  applyHumanSafety,
  humanEntityIdFor,
  isPubliclyFindable,
} from "./visibility.js";

export interface GatewayOk<T> {
  ok: true;
  status: 200;
  body: T;
}

export interface GatewayErr {
  ok: false;
  status: 400 | 401 | 403 | 404 | 409 | 429;
  body: { error: string; status: number };
}

export interface RequestMeta {
  ip?: string;
}

export type GatewayResult<T> = GatewayOk<T> | GatewayErr;

function fail(status: GatewayErr["status"], error: string): GatewayErr {
  return { ok: false, status, body: { error, status } };
}

function fromError(err: unknown): GatewayErr {
  if (err instanceof AuthzError) return fail(err.status, err.message);
  const message = err instanceof Error ? err.message : String(err);
  if (/unknown entity|not found|Unknown entity/i.test(message)) return fail(404, message);
  return fail(400, message);
}

async function persistWrite(network: WhoElseNetwork, entity: { id: string }, caller: Caller): Promise<void> {
  if (!network.persist) return;
  const stored = network.engine.store.get(entity.id);
  if (!stored) return;
  const owner = network.identity.ownersOf(stored.id)[0] ?? caller.principalId;
  for (const p of network.identity.principals.values()) await network.persist.upsertPrincipal(p);
  for (const a of network.identity.accounts.values()) await network.persist.upsertAccount(a);
  for (const c of network.identity.credentials.values()) await network.persist.upsertCredential(c);
  await network.persist.upsertEntity(stored, owner);
  for (const row of network.identity.ownership.filter((o) => o.entityId === stored.id)) {
    await network.persist.upsertOwnership(row);
  }
}

export async function persistIdentity(network: WhoElseNetwork): Promise<void> {
  if (!network.persist) return;
  for (const p of network.identity.principals.values()) await network.persist.upsertPrincipal(p);
  for (const a of network.identity.accounts.values()) await network.persist.upsertAccount(a);
  for (const c of network.identity.credentials.values()) await network.persist.upsertCredential(c);
}

async function enforceRate(network: WhoElseNetwork, action: RateAction, bucket: string): Promise<void> {
  const hit = await network.rateLimit.hit(action, bucket);
  if (!hit.ok) {
    throw new AuthzError(429, `rate limit exceeded for ${action}`);
  }
}

async function enforceWriteRate(network: WhoElseNetwork, caller: Caller, action: RateAction): Promise<void> {
  await enforceRate(network, action, principalBucket(caller.principalId, action));
}

async function enforceAnonRead(network: WhoElseNetwork, caller: Caller | null, meta?: RequestMeta): Promise<void> {
  if (caller || !meta?.ip) return;
  await enforceRate(network, "read", ipBucket(meta.ip, "read"));
}

function audit(
  network: WhoElseNetwork,
  caller: Caller | null,
  action: string,
  entityId?: string,
  extra?: Record<string, unknown>,
) {
  const row = network.identity.recordAudit({
    principalId: caller?.principalId,
    action,
    entityId,
    payload: extra,
  });
  void network.persist?.appendAudit(row);
}

export async function recordUsage(
  network: WhoElseNetwork,
  event: { name: UsageName; principalId?: string; payload?: Record<string, unknown> },
): Promise<UsageEvent | undefined> {
  try {
    const full = network.usage.record(event);
    await network.persist?.insertUsage(full);
    return full;
  } catch {
    return undefined;
  }
}

export async function gatewayFind(
  network: WhoElseNetwork,
  request: WhoElseRequest,
  caller: Caller | null,
  meta?: RequestMeta,
) {
  try {
    await enforceAnonRead(network, caller, meta);
    if (request.requester) {
      requireCaller(caller);
      network.identity.assertOwns(caller, request.requester);
    }
    const pooled = await findPreferLive(network, request);
    void recordUsage(network, {
      name: "find",
      principalId: caller?.principalId,
      payload: {
        query: request.context ?? request.matchId ?? request.entityId,
        n: pooled.result.candidates.length,
        pool: pooled.pool,
      },
    });
    return { ok: true as const, status: 200 as const, body: toPublicWhoElseResult(pooled.result) };
  } catch (err) {
    return fromError(err);
  }
}

export async function gatewayRegister(
  network: WhoElseNetwork,
  spec: RegistrationSpec,
  caller: Caller | null,
): Promise<GatewayResult<{ entity: ReturnType<typeof toPublicEntity>; agentKey?: IssuedAgentKey }>> {
  try {
    const who = requireCaller(caller);
    requireScope(who, "register");
    await enforceWriteRate(network, who, "register");
    const type = assertRegisterType(who, spec.type);
    if (spec.id && network.engine.store.get(spec.id)) {
      throw new AuthzError(409, "cannot register over existing id");
    }
    let entity = network.engine.register({ ...spec, type });
    if (type === "human") {
      entity = network.engine.upsertStored(
        applyHumanSafety(stampHumanLabels(entity), {
          affirmed: network.identity.isAgeAffirmed(who.principalId),
        }),
      );
    }
    network.identity.own(entity.id, who.principalId, "owner");
    let agentKey: IssuedAgentKey | undefined;
    if (entity.type === "agent" && who.kind === "human") {
      const agentPrincipal = network.identity.createPrincipal({
        kind: "agent",
        displayName: entity.name,
      });
      network.identity.own(entity.id, agentPrincipal.id, "owner");
      agentKey = network.identity.issueKey(agentPrincipal.id);
    }
    audit(network, who, "register", entity.id, { type: entity.type });
    await persistWrite(network, entity, who);
    await persistIdentity(network);
    return { ok: true, status: 200, body: { entity: toPublicEntity(entity), agentKey } };
  } catch (err) {
    return fromError(err);
  }
}

export async function gatewayPublish(
  network: WhoElseNetwork,
  entityId: string,
  publications: PublicationSpec[],
  caller: Caller | null,
) {
  try {
    const who = requireCaller(caller);
    const withdrawing = publications.some((p) => p.status === "withdrawn" || p.status === "expired");
    requireScope(who, withdrawing ? "withdraw" : "publish");
    await enforceWriteRate(network, who, withdrawing ? "withdraw" : "publish");
    if (!network.engine.store.get(entityId)) throw new Error(`Unknown entity ${entityId}`);
    network.identity.assertOwns(who, entityId);
    let entity = network.engine.publish(entityId, publications);
    if (entity.type === "human" && entity.provenance === "user") {
      entity = network.engine.upsertStored(
        applyHumanSafety(entity, { affirmed: network.identity.isAgeAffirmed(who.principalId) }),
      );
    }
    audit(network, who, withdrawing ? "withdraw" : "publish", entityId, {
      publications: publications.map((p) => ({ kind: p.kind, capability: p.capability, status: p.status })),
    });
    await persistWrite(network, entity, who);
    return {
      ok: true as const,
      status: 200 as const,
      body: { entity: toPublicEntity(entity) },
    };
  } catch (err) {
    return fromError(err);
  }
}

export async function gatewayFeedback(
  network: WhoElseNetwork,
  input: { entityId: string; signal: "more" | "less"; query?: string },
  caller: Caller | null,
) {
  try {
    const who = requireCaller(caller);
    requireScope(who, "feedback");
    await enforceWriteRate(network, who, "feedback");
    const event = network.engine.feedback(input.entityId, input.signal, input.query);
    audit(network, who, "feedback", input.entityId, { signal: input.signal });
    return { ok: true as const, status: 200 as const, body: { ok: true, event } };
  } catch (err) {
    return fromError(err);
  }
}

export async function gatewayInvoke(
  network: WhoElseNetwork,
  entityId: string,
  body: { task?: string; input?: string; context?: string },
  caller: Caller | null,
) {
  try {
    const who = requireCaller(caller);
    requireScope(who, "invoke");
    const invoked = await network.engine.invokeAsync(entityId, body);
    audit(network, who, "invoke", entityId, { task: body.task, receiptId: invoked.receipt.id });
    await persistLoopObjects(network, { receipts: [invoked.receipt], matches: invoked.match ? [invoked.match] : [] });
    return { ok: true as const, status: 200 as const, body: invoked };
  } catch (err) {
    return fromError(err);
  }
}

export async function gatewayDelegate(
  network: WhoElseNetwork,
  opts: { task: string; intent?: string; from?: string; select?: "first" | "cheapest" | "fastest" | "evidence"; limit?: number },
  caller: Caller | null,
) {
  try {
    const who = requireCaller(caller);
    requireScope(who, "delegate");
    if (opts.from) network.identity.assertOwns(who, opts.from);
    const result = network.engine.delegate(opts);
    audit(network, who, "delegate", opts.from, { task: opts.task, receiptId: result.receipt?.id });
    if (result.receipt) {
      await persistLoopObjects(network, {
        receipts: [result.receipt],
        matches: result.match ? [result.match] : [],
      });
    }
    return { ok: true as const, status: 200 as const, body: result };
  } catch (err) {
    return fromError(err);
  }
}

export async function gatewayInterest(
  network: WhoElseNetwork,
  input: { entityId: string; note?: string },
  caller: Caller | null,
) {
  try {
    const who = requireCaller(caller);
    const record = network.engine.recordHumanInterest(input.entityId, input.note);
    audit(network, who, "interest", input.entityId);
    return {
      ok: true as const,
      status: 200 as const,
      body: { ok: true, record, message: "Interest recorded (stub). No message was sent." },
    };
  } catch (err) {
    return fromError(err);
  }
}

export async function gatewayMintAgentKey(network: WhoElseNetwork, caller: Caller | null) {
  try {
    const who = requireCaller(caller);
    if (who.kind !== "human") throw new AuthzError(403, "only signed-in humans mint agent keys");
    const agent = network.identity.createPrincipal({
      kind: "agent",
      displayName: `agent-for-${who.principalId}`,
    });
    const issued = network.identity.issueKey(agent.id);
    audit(network, who, "mint-key", undefined, { keyId: issued.keyId, agentPrincipalId: agent.id });
    await persistIdentity(network);
    return { ok: true as const, status: 200 as const, body: { agentKey: issued, principalId: agent.id } };
  } catch (err) {
    return fromError(err);
  }
}

export async function gatewayRotateAgentKey(network: WhoElseNetwork, caller: Caller | null, keyId?: string) {
  try {
    const who = requireCaller(caller);
    const issued = network.identity.rotateKey(who, keyId ?? who.keyId);
    audit(network, who, "rotate-key", undefined, { keyId: issued.keyId });
    await persistIdentity(network);
    return { ok: true as const, status: 200 as const, body: { agentKey: issued } };
  } catch (err) {
    return fromError(err);
  }
}

export async function gatewayRevokeAgentKey(network: WhoElseNetwork, caller: Caller | null, keyId: string) {
  try {
    const who = requireCaller(caller);
    const cred = network.identity.revokeKey(who, keyId);
    audit(network, who, "revoke-key", undefined, { keyId });
    await persistIdentity(network);
    return {
      ok: true as const,
      status: 200 as const,
      body: { ok: true, keyId: cred.keyId, revoked_at: cred.revoked_at },
    };
  } catch (err) {
    return fromError(err);
  }
}

export function publicEntityOr404(engine: WhoElseEngine, id: string, opts?: { allowPrivate?: boolean }) {
  const entity = engine.store.get(id);
  if (!entity) return fail(404, "not found");
  if (!opts?.allowPrivate && !isPubliclyFindable(entity)) return fail(404, "not found");
  return { ok: true as const, status: 200 as const, body: toPublicEntity(entity) };
}

export async function gatewayMe(network: WhoElseNetwork, caller: Caller | null) {
  try {
    const who = requireCaller(caller);
    await persistIdentity(network);
    const state = onboardState(network, who);
    return {
      ok: true as const,
      status: 200 as const,
      body: {
        principalId: who.principalId,
        kind: who.kind,
        entity: state.entity ? toOwnerEntity(state.entity) : null,
        visibility: state.visibility,
        ageAffirmed: state.ageAffirmed,
        findable: state.findable,
        needsOnboarding: state.needsOnboarding,
        affirmation: state.affirmation,
      },
    };
  } catch (err) {
    return fromError(err);
  }
}

export async function gatewayOnboard(
  network: WhoElseNetwork,
  spec: OnboardSpec,
  caller: Caller | null,
): Promise<GatewayResult<{ entity: ReturnType<typeof toOwnerEntity>; ageAffirmed: boolean; findable: boolean }>> {
  try {
    const who = requireHumanCaller(requireCaller(caller));
    requireScope(who, "register");
    await enforceWriteRate(network, who, "onboard");
    if (!spec.name?.trim() || !spec.description?.trim()) {
      throw new Error("name and description required");
    }
    let publications = parseOnboardPublications(spec);
    if (!publications.length) publications = [{ ...DEFAULT_HUMAN_SEEK }];
    const existing = ownedHumanEntity(network, who.principalId);
    const id = existing?.id ?? humanEntityIdFor(who.principalId);
    let entity;
    if (existing) {
      if (spec.name) existing.name = spec.name.trim();
      if (spec.description) existing.description = spec.description.trim();
      if (spec.location) existing.location = spec.location;
      if (spec.availability) existing.availability = spec.availability;
      network.identity.own(existing.id, who.principalId, "owner");
      entity = network.engine.publish(existing.id, publications);
      entity = network.engine.upsertStored(stampHumanLabels(entity));
    } else {
      if (network.engine.store.get(id)) throw new AuthzError(409, "cannot register over existing id");
      entity = network.engine.register({
        id,
        type: "human",
        name: spec.name.trim(),
        description: spec.description.trim(),
        publications,
        location: spec.location,
        availability: spec.availability,
      });
      network.identity.own(entity.id, who.principalId, "owner");
      entity = network.engine.upsertStored(stampHumanLabels(entity));
    }
    if (spec.affirmAge) {
      await applyAffirmation(network, who);
    }
    const affirmed = network.identity.isAgeAffirmed(who.principalId);
    entity = network.engine.upsertStored(
      applyHumanSafety(entity, { affirmed, activateDatingSeeks: Boolean(spec.affirmAge && affirmed) }),
    );
    if (who.kind === "human") {
      const principal = network.identity.principals.get(who.principalId);
      if (principal) {
        principal.displayName = entity.name;
        principal.updated_at = new Date().toISOString();
      }
    }
    audit(network, who, spec.affirmAge ? "onboard-affirm" : "onboard", entity.id, {
      visibility: entity.metadata.visibility,
    });
    await persistWrite(network, entity, who);
    await persistIdentity(network);
    const stored = network.engine.store.get(entity.id)!;
    void recordUsage(network, {
      name: "onboard",
      principalId: who.principalId,
      payload: { entityId: stored.id, findable: isPubliclyFindable(stored), affirmed },
    });
    return {
      ok: true,
      status: 200,
      body: {
        entity: toOwnerEntity(stored),
        ageAffirmed: affirmed,
        findable: isPubliclyFindable(stored),
      },
    };
  } catch (err) {
    return fromError(err);
  }
}

async function applyAffirmation(network: WhoElseNetwork, who: Caller, version = AGE_AFFIRMATION_VERSION): Promise<void> {
  if (version !== AGE_AFFIRMATION_VERSION) {
    throw new Error(`unknown affirmation version (current is ${AGE_AFFIRMATION_VERSION})`);
  }
  network.identity.affirmAge(who.principalId, version);
}

export async function gatewayAffirm(
  network: WhoElseNetwork,
  caller: Caller | null,
  input: { version?: string } = {},
): Promise<
  GatewayResult<{
    ageAffirmed: boolean;
    version: string;
    text: string;
    entity: ReturnType<typeof toOwnerEntity> | null;
    findable: boolean;
  }>
> {
  try {
    const who = requireHumanCaller(requireCaller(caller));
    await enforceWriteRate(network, who, "affirm");
    await applyAffirmation(network, who, input.version ?? AGE_AFFIRMATION_VERSION);
    const existing = ownedHumanEntity(network, who.principalId);
    let entity = existing ?? null;
    if (entity) {
      entity = network.engine.upsertStored(applyHumanSafety(entity, { affirmed: true, activateDatingSeeks: true }));
      await persistWrite(network, entity, who);
    }
    audit(network, who, "affirm-age", entity?.id, { version: AGE_AFFIRMATION_VERSION });
    await persistIdentity(network);
    const stored = entity ? network.engine.store.get(entity.id) : null;
    return {
      ok: true,
      status: 200,
      body: {
        ageAffirmed: true,
        version: AGE_AFFIRMATION_VERSION,
        text: AGE_AFFIRMATION_TEXT,
        entity: stored ? toOwnerEntity(stored) : null,
        findable: stored ? isPubliclyFindable(stored) : false,
      },
    };
  } catch (err) {
    return fromError(err);
  }
}

function defaultRequesterId(network: WhoElseNetwork, caller: Caller): string | undefined {
  if (caller.kind === "human") {
    const human = ownedHumanEntity(network, caller.principalId);
    if (human) return human.id;
  }
  return network.identity.entitiesOwnedBy(caller.principalId).find((id) => network.engine.store.get(id));
}

async function persistLoopObjects(
  network: WhoElseNetwork,
  input: {
    matches?: import("./types.js").MatchRecord[];
    receipts?: import("./types.js").InvokeReceipt[];
    messages?: import("./types.js").ThreadMessage[];
  },
): Promise<void> {
  if (!network.persist) return;
  for (const m of input.matches ?? []) await network.persist.upsertMatch(m);
  for (const r of input.receipts ?? []) {
    await network.persist.upsertReceipt(r);
    await network.persist.upsertReputation(network.engine.store.reputationOf(r.actorEntityId));
    await network.persist.upsertReputation(network.engine.store.reputationOf(r.counterpartyEntityId));
  }
  for (const msg of input.messages ?? []) await network.persist.upsertMessage(msg);
}

function publicEntityOrNull(network: WhoElseNetwork, id: string) {
  const entity = network.engine.store.get(id);
  return entity ? toPublicEntity(entity) : null;
}

export async function gatewayProposeMatch(
  network: WhoElseNetwork,
  input: {
    requesterEntityId?: string;
    candidateEntityId: string;
    seekPublicationId?: string;
    offerPublicationId?: string;
    query?: string;
    score?: number;
    explanation?: { why: string; commonalities?: string[] };
  },
  caller: Caller | null,
) {
  try {
    const who = requireCaller(caller);
    requireScope(who, "match");
    await enforceWriteRate(network, who, "match");
    const requesterEntityId = input.requesterEntityId ?? defaultRequesterId(network, who);
    if (!requesterEntityId) throw new Error("requester entity required — onboard or pass requesterEntityId");
    network.identity.assertOwns(who, requesterEntityId);
    if (!network.engine.store.get(input.candidateEntityId)) {
      throw new Error(`Unknown entity ${input.candidateEntityId}`);
    }
    const match = network.engine.proposeMatch({
      query: input.query ?? "Who else?",
      requesterEntityId,
      candidateEntityId: input.candidateEntityId,
      seekPublicationId: input.seekPublicationId,
      offerPublicationId: input.offerPublicationId,
      score: input.score,
      explanation: input.explanation,
    });
    const receipt = network.engine.store.recordReceipt({
      matchId: match.id,
      actorEntityId: requesterEntityId,
      counterpartyEntityId: input.candidateEntityId,
      actionType: "connect",
      status: "proposed",
      task: "propose match",
      would: "propose a durable SEEK↔OFFER match",
      outcome: { matchId: match.id },
      result: { matchId: match.id },
      evidence: {},
    });
    audit(network, who, "match", requesterEntityId, { matchId: match.id, candidateEntityId: input.candidateEntityId });
    await persistLoopObjects(network, { matches: [network.engine.store.match(match.id)!], receipts: [receipt] });
    void recordUsage(network, {
      name: "match_propose",
      principalId: who.principalId,
      payload: { matchId: match.id, candidateEntityId: input.candidateEntityId },
    });
    return {
      ok: true as const,
      status: 200 as const,
      body: {
        match: toPublicMatch(network.engine.store.match(match.id)!),
        receipt: toPublicReceipt(receipt),
        note: "Find does not persist matches. This propose/save is the explicit act.",
      },
    };
  } catch (err) {
    return fromError(err);
  }
}

export async function gatewayListMatches(network: WhoElseNetwork, caller: Caller | null) {
  try {
    const who = requireCaller(caller);
    const owned = new Set(network.identity.entitiesOwnedBy(who.principalId));
    const matches = network.engine.store.matches.filter(
      (m) => owned.has(m.requesterEntityId) || owned.has(m.candidateEntityId),
    );
    return {
      ok: true as const,
      status: 200 as const,
      body: {
        matches: matches.map((m) => ({
          ...toPublicMatch(m),
          requester: publicEntityOrNull(network, m.requesterEntityId),
          candidate: publicEntityOrNull(network, m.candidateEntityId),
          receipts: network.engine.store.receiptsFor({ matchId: m.id }).map(toPublicReceipt),
          messages: network.engine.store.messagesFor(m.id).map(toPublicMessage),
        })),
      },
    };
  } catch (err) {
    return fromError(err);
  }
}

export async function gatewayGetMatch(network: WhoElseNetwork, matchId: string, caller: Caller | null) {
  try {
    const who = requireCaller(caller);
    const match = network.engine.store.match(matchId);
    if (!match) return fail(404, "not found");
    network.identity.assertParty(who, [match.requesterEntityId, match.candidateEntityId]);
    return {
      ok: true as const,
      status: 200 as const,
      body: {
        match: toPublicMatch(match),
        requester: publicEntityOrNull(network, match.requesterEntityId),
        candidate: publicEntityOrNull(network, match.candidateEntityId),
        receipts: network.engine.store.receiptsFor({ matchId }).map(toPublicReceipt),
        messages: network.engine.store.messagesFor(matchId).map(toPublicMessage),
      },
    };
  } catch (err) {
    return fromError(err);
  }
}

export async function gatewayAct(
  network: WhoElseNetwork,
  input: {
    matchId: string;
    action: ActionType;
    actorEntityId?: string;
    message?: string;
    task?: string;
    status?: ReceiptStatus;
    outcome?: Record<string, unknown>;
  },
  caller: Caller | null,
) {
  try {
    const who = requireCaller(caller);
    requireScope(who, input.action === "invoke" ? "invoke" : input.action === "delegate" ? "delegate" : "act");
    await enforceWriteRate(network, who, "act");
    const match = network.engine.store.match(input.matchId);
    if (!match) return fail(404, "not found");
    network.identity.assertParty(who, [match.requesterEntityId, match.candidateEntityId]);
    const actorEntityId =
      input.actorEntityId && network.identity.owns(who.principalId, input.actorEntityId)
        ? input.actorEntityId
        : [match.requesterEntityId, match.candidateEntityId].find((id) => network.identity.owns(who.principalId, id));
    if (!actorEntityId) throw new AuthzError(403, "forbidden: not a party");
    if ((input.action === "accept" || input.action === "decline") && actorEntityId === match.requesterEntityId) {
      throw new AuthzError(403, "requester cannot accept/decline their own proposal — candidate acts");
    }
    const result = network.engine.act({
      matchId: input.matchId,
      action: input.action,
      actorEntityId,
      message: input.message,
      task: input.task,
      status: input.status,
      outcome: input.outcome,
    });
    audit(network, who, `act:${input.action}`, actorEntityId, { matchId: input.matchId, receiptId: result.receipt.id });
    void recordUsage(network, {
      name: "act",
      principalId: who.principalId,
      payload: { matchId: input.matchId, action: input.action, receiptId: result.receipt.id },
    });
    await persistLoopObjects(network, {
      matches: [result.match],
      receipts: [result.receipt],
      messages: result.message ? [result.message] : [],
    });
    return {
      ok: true as const,
      status: 200 as const,
      body: {
        match: toPublicMatch(result.match),
        receipt: toPublicReceipt(result.receipt),
        message: result.message ? toPublicMessage(result.message) : undefined,
        invoked: result.invoked,
      },
    };
  } catch (err) {
    return fromError(err);
  }
}

export async function gatewayWriteReceipt(
  network: WhoElseNetwork,
  input: {
    matchId?: string;
    actorEntityId?: string;
    counterpartyEntityId: string;
    actionType: ActionType;
    status: ReceiptStatus;
    outcome?: Record<string, unknown>;
    task?: string;
  },
  caller: Caller | null,
) {
  try {
    const who = requireCaller(caller);
    requireScope(who, "receipt");
    await enforceWriteRate(network, who, "receipt");
    const actorEntityId = input.actorEntityId ?? defaultRequesterId(network, who);
    if (!actorEntityId) throw new Error("actorEntityId required");
    if (input.matchId) {
      const match = network.engine.store.match(input.matchId);
      if (!match) return fail(404, "not found");
      network.identity.assertParty(who, [match.requesterEntityId, match.candidateEntityId]);
    } else {
      network.identity.assertOwns(who, actorEntityId);
    }
    const receipt = network.engine.store.recordReceipt({
      matchId: input.matchId,
      actorEntityId,
      counterpartyEntityId: input.counterpartyEntityId,
      actionType: input.actionType,
      status: input.status,
      task: input.task ?? input.actionType,
      would: `${input.actionType} → ${input.status}`,
      outcome: input.outcome ?? {},
      result: input.outcome ?? {},
      evidence:
        input.status === "completed" && input.outcome?.verifiedBy
          ? { verified: true, verifiedBy: String(input.outcome.verifiedBy) }
          : {},
    });
    const match = input.matchId ? network.engine.store.match(input.matchId) : undefined;
    audit(network, who, "receipt", actorEntityId, { receiptId: receipt.id, status: input.status });
    void recordUsage(network, {
      name: "receipt",
      principalId: who.principalId,
      payload: { receiptId: receipt.id, status: input.status },
    });
    await persistLoopObjects(network, { receipts: [receipt], matches: match ? [match] : [] });
    return {
      ok: true as const,
      status: 200 as const,
      body: {
        receipt: toPublicReceipt(receipt),
        reputation: {
          actor: toPublicReputation(network.engine.store.reputationOf(actorEntityId)),
          counterparty: toPublicReputation(network.engine.store.reputationOf(input.counterpartyEntityId)),
        },
      },
    };
  } catch (err) {
    return fromError(err);
  }
}

export async function gatewayCompile(
  network: WhoElseNetwork,
  input: { text?: string; context?: string; intent?: string; find?: boolean; limit?: number },
  caller: Caller | null,
  meta?: RequestMeta,
) {
  try {
    const text = String(input.text ?? input.context ?? input.intent ?? "").trim();
    if (!text) return fail(400, "text required");
    if (input.find) await enforceAnonRead(network, caller, meta);
    const compiled = await compileAsync(text, network.engine, {
      find: false,
      limit: input.limit ?? 5,
    } satisfies CompileOptions);
    let find = compiled.find;
    if (input.find && compiled.classification !== "NOT_WHOELSE") {
      const pooled = await findPreferLive(network, {
        context: compiled.ir.intent,
        constraints: compiled.ir.constraints,
        exclude: compiled.ir.exclusions,
        limit: input.limit ?? 5,
      });
      find = pooled.result;
    }
    void recordUsage(network, {
      name: "compile",
      principalId: caller?.principalId,
      payload: { classification: compiled.classification, find: Boolean(input.find) },
    });
    return {
      ok: true as const,
      status: 200 as const,
      body: {
        classification: compiled.classification,
        reason: compiled.reason,
        confidence: compiled.confidence,
        locked: compiled.locked,
        usedLlm: compiled.usedLlm,
        ir: compiled.ir,
        seekDraft: compiled.seekDraft,
        find: find ? toPublicWhoElseResult(find) : undefined,
      },
    };
  } catch (err) {
    return fromError(err);
  }
}

export async function gatewayStats(network: WhoElseNetwork) {
  const usage = network.persist ? await network.persist.usageStats() : network.usage.summarize();
  return {
    ok: true as const,
    status: 200 as const,
    body: {
      persistence: network.persist ? "postgres" : "memory",
      seedMode: network.seedMode,
      network: network.engine.store.stats(),
      events: usage.counts,
      recent: usage.recent.map((e) => ({
        name: e.name,
        at: e.at,
        payload: e.payload,
      })),
      totalEvents: usage.total,
      note: "Recorded product events. Not vanity metrics. Empty production is expected until people join.",
    },
  };
}

export async function gatewayReputation(
  network: WhoElseNetwork,
  entityId: string,
  caller: Caller | null,
  meta?: RequestMeta,
) {
  try {
    await enforceAnonRead(network, caller, meta);
    if (!network.engine.store.get(entityId)) return fail(404, "not found");
    return {
      ok: true as const,
      status: 200 as const,
      body: toPublicReputation(network.engine.store.reputationOf(entityId)),
    };
  } catch (err) {
    return fromError(err);
  }
}
