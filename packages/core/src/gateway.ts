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
import { toOwnerEntity, toPublicEntity, toPublicWhoElseResult } from "./public-dto.js";
import { ipBucket, principalBucket, type RateAction } from "./rate-limit.js";
import type { PublicationSpec, RegistrationSpec, WhoElseRequest } from "./types.js";
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
    const result = await network.engine.whoelseAsync(request);
    return { ok: true as const, status: 200 as const, body: toPublicWhoElseResult(result) };
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
    const invoked = network.engine.invoke(entityId, body);
    audit(network, who, "invoke", entityId, { task: body.task });
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
    audit(network, who, "delegate", opts.from, { task: opts.task });
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
