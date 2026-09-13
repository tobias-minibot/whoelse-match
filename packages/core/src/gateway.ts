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
import { toPublicEntity, toPublicWhoElseResult } from "./public-dto.js";
import type { PublicationSpec, RegistrationSpec, WhoElseRequest } from "./types.js";

export interface GatewayOk<T> {
  ok: true;
  status: 200;
  body: T;
}

export interface GatewayErr {
  ok: false;
  status: 400 | 401 | 403 | 404 | 409;
  body: { error: string; status: number };
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

async function persistIdentity(network: WhoElseNetwork): Promise<void> {
  if (!network.persist) return;
  for (const p of network.identity.principals.values()) await network.persist.upsertPrincipal(p);
  for (const a of network.identity.accounts.values()) await network.persist.upsertAccount(a);
  for (const c of network.identity.credentials.values()) await network.persist.upsertCredential(c);
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
) {
  try {
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
    const type = assertRegisterType(who, spec.type);
    if (spec.id && network.engine.store.get(spec.id)) {
      throw new AuthzError(409, "cannot register over existing id");
    }
    const entity = network.engine.register({ ...spec, type });
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
    if (!network.engine.store.get(entityId)) throw new Error(`Unknown entity ${entityId}`);
    network.identity.assertOwns(who, entityId);
    const entity = network.engine.publish(entityId, publications);
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

export function publicEntityOr404(engine: WhoElseEngine, id: string) {
  const entity = engine.store.get(id);
  if (!entity) return fail(404, "not found");
  return { ok: true as const, status: 200 as const, body: toPublicEntity(entity) };
}
