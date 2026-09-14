import type { InvokeReceipt, ReceiptStatus, ReputationRecord } from "./types.js";

/** Max additive boost when history is clean completed work. */
export const REPUTATION_BOOST_MAX = 0.18;
export const REPUTATION_PENALTY_MAX = 0.2;
export const NETWORK_REPUTATION_ISSUER = "whoelse-network";

const EMPTY: Omit<ReputationRecord, "entityId" | "updated_at"> = {
  completionReliability: 0,
  responseRate: 0,
  acceptanceRate: 0,
  failureRate: 0,
  verifiedSuccesses: 0,
  proposed: 0,
  accepted: 0,
  declined: 0,
  started: 0,
  completed: 0,
  failed: 0,
  cancelled: 0,
  evidenceReceiptIds: [],
};

function emptyRecord(entityId: string, at: string): ReputationRecord {
  return { entityId, ...EMPTY, evidenceReceiptIds: [], updated_at: at };
}

function involves(receipt: InvokeReceipt, entityId: string): boolean {
  return (
    receipt.actorEntityId === entityId ||
    receipt.counterpartyEntityId === entityId ||
    receipt.fromAgentId === entityId ||
    receipt.toAgentId === entityId
  );
}

function isVerifiedSuccess(receipt: InvokeReceipt): boolean {
  if (receipt.status !== "completed") return false;
  const issuer =
    receipt.evidence.verifiedBy ??
    (typeof receipt.outcome.verifiedBy === "string" ? receipt.outcome.verifiedBy : undefined);
  return Boolean(receipt.evidence.verified && issuer);
}

/**
 * Recompute portable aggregates from receipts. Evidence is receipt ids —
 * never a self-asserted `verified: true` without an issuer.
 */
export function computeReputation(entityId: string, receipts: InvokeReceipt[], at = new Date().toISOString()): ReputationRecord {
  const mine = receipts.filter((r) => involves(r, entityId));
  const counts: Record<ReceiptStatus, number> = {
    proposed: 0,
    accepted: 0,
    declined: 0,
    started: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
  };
  const evidenceReceiptIds: string[] = [];
  let verifiedSuccesses = 0;
  for (const r of mine) {
    evidenceReceiptIds.push(r.id);
    const isActor = r.actorEntityId === entityId || r.fromAgentId === entityId;
    const isWorker =
      r.counterpartyEntityId === entityId ||
      r.toAgentId === entityId ||
      (isActor && (r.actionType === "accept" || r.actionType === "decline" || r.actionType === "cancel"));
    const workAction = r.actionType === "invoke" || r.actionType === "delegate" || r.actionType === "handoff";
    if (workAction) {
      if (isWorker && !isActor) counts[r.status] += 1;
      else if (isActor && (r.status === "proposed" || r.status === "started")) counts[r.status] += 1;
    } else if (isActor) {
      counts[r.status] += 1;
    } else if (isWorker && (r.status === "accepted" || r.status === "declined" || r.status === "completed")) {
      counts[r.status] += 1;
    }
    if (isWorker && !isActor && isVerifiedSuccess(r)) verifiedSuccesses += 1;
    if (isActor && !workAction && isVerifiedSuccess(r)) verifiedSuccesses += 1;
  }
  const responded = counts.accepted + counts.declined + counts.started + counts.completed + counts.failed;
  const proposedOrResponded = counts.proposed + responded;
  const decided = counts.accepted + counts.declined;
  const finished = counts.completed + counts.failed;
  const startedish = counts.started + counts.completed + counts.failed;
  return {
    entityId,
    completionReliability: finished ? counts.completed / finished : 0,
    responseRate: proposedOrResponded ? responded / proposedOrResponded : 0,
    acceptanceRate: decided ? counts.accepted / decided : 0,
    failureRate: startedish ? counts.failed / startedish : 0,
    verifiedSuccesses,
    proposed: counts.proposed,
    accepted: counts.accepted,
    declined: counts.declined,
    started: counts.started,
    completed: counts.completed,
    failed: counts.failed,
    cancelled: counts.cancelled,
    evidenceReceiptIds,
    updated_at: at,
  };
}

/** Additive find-rank term. 0 when there is no network history. */
export function reputationBoost(rep?: ReputationRecord | null): number {
  if (!rep) return 0;
  const verified = Math.min(1, rep.verifiedSuccesses / 3);
  const raw = 0.16 * rep.completionReliability + 0.06 * verified - 0.14 * rep.failureRate;
  return Math.max(-REPUTATION_PENALTY_MAX, Math.min(REPUTATION_BOOST_MAX, raw));
}

export function emptyReputation(entityId: string, at = new Date().toISOString()): ReputationRecord {
  return emptyRecord(entityId, at);
}

export function publicReputation(rep: ReputationRecord) {
  return {
    entityId: rep.entityId,
    completionReliability: Number(rep.completionReliability.toFixed(4)),
    responseRate: Number(rep.responseRate.toFixed(4)),
    acceptanceRate: Number(rep.acceptanceRate.toFixed(4)),
    failureRate: Number(rep.failureRate.toFixed(4)),
    verifiedSuccesses: rep.verifiedSuccesses,
    proposed: rep.proposed,
    accepted: rep.accepted,
    declined: rep.declined,
    started: rep.started,
    completed: rep.completed,
    failed: rep.failed,
    cancelled: rep.cancelled,
    evidenceReceiptIds: [...rep.evidenceReceiptIds],
    issuer: NETWORK_REPUTATION_ISSUER,
    updated_at: rep.updated_at,
  };
}
