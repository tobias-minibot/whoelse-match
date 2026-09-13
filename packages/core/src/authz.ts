/**
 * Launch authorization: humans (Clerk) and agents (hashed API keys)
 * own the entities they publish. Find stays public. Writes do not.
 */

export const AGENT_SCOPES = [
  "register",
  "publish",
  "withdraw",
  "invoke",
  "delegate",
  "feedback",
  "match",
  "act",
  "receipt",
] as const;

export type AgentScope = (typeof AGENT_SCOPES)[number];
export type PrincipalKind = "human" | "agent";

export class AuthzError extends Error {
  readonly status: 401 | 403 | 409 | 429;
  constructor(status: 401 | 403 | 409 | 429, message: string) {
    super(message);
    this.name = "AuthzError";
    this.status = status;
  }
}

export interface Principal {
  id: string;
  kind: PrincipalKind;
  displayName?: string;
  clerkUserId?: string;
  /** Every synthetic fixture is labeled. Never a real person. */
  synthetic?: boolean;
  /** ISO timestamp. Private — never in public DTOs. */
  ageAffirmedAt?: string;
  /** Version key of the affirmation text the caller accepted. */
  ageAffirmationVersion?: string;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  principalId: string;
  clerkUserId: string;
  created_at: string;
}

export interface AgentCredential {
  id: string;
  principalId: string;
  keyId: string;
  keyHash: string;
  scopes: AgentScope[];
  created_at: string;
  rotated_at?: string;
  revoked_at?: string;
  last_used_at?: string;
}

export interface Ownership {
  entityId: string;
  principalId: string;
  role: "owner" | "delegate";
  created_at: string;
}

export interface WriteAudit {
  id: string;
  at: string;
  principalId?: string;
  action: string;
  entityId?: string;
  publicationId?: string;
  payload?: Record<string, unknown>;
}

export interface Caller {
  principalId: string;
  kind: PrincipalKind;
  clerkUserId?: string;
  scopes: AgentScope[];
  synthetic?: boolean;
  /** Present when authenticated via Bearer agent key. */
  keyId?: string;
}

export function requireCaller(caller: Caller | null | undefined): Caller {
  if (!caller) throw new AuthzError(401, "authentication required");
  return caller;
}

export function requireScope(caller: Caller, scope: AgentScope): void {
  if (!caller.scopes.includes(scope)) {
    throw new AuthzError(403, `missing scope: ${scope}`);
  }
}

/** Human/AI type is not self-assertable across the human↔machine line. */
export function assertRegisterType(caller: Caller, type: string | undefined): string {
  const resolved = type ?? (caller.kind === "human" ? "human" : "agent");
  if (resolved === "ai") {
    throw new AuthzError(403, "cannot impersonate type: ai is seed/synthetic only");
  }
  if (caller.kind === "agent" && resolved === "human") {
    throw new AuthzError(403, "cannot impersonate type: agent cannot register as human");
  }
  if (caller.kind === "human" && resolved !== "human" && resolved !== "agent") {
    throw new AuthzError(403, `cannot impersonate type: ${resolved}`);
  }
  return resolved;
}

export function isProtectedEntityType(type: string): boolean {
  return type === "human" || type === "ai";
}