import {
  AGENT_SCOPES,
  AuthzError,
  requireCaller,
  type Account,
  type AgentCredential,
  type AgentScope,
  type Caller,
  type Ownership,
  type Principal,
  type WriteAudit,
} from "./authz.js";
import { hashAgentKey, hashesEqual, mintAgentKey, parseAgentKey } from "./keys.js";
import { seedLabel } from "./seed-policy.js";

export const SYNTHETIC_OWNER_PRINCIPAL_ID = "principal-synthetic";
export const SYNTHETIC_INTRUDER_PRINCIPAL_ID = "principal-synthetic-intruder";
export const DEMO_OWNER_KEY_ID = "seedowner";
export const DEMO_INTRUDER_KEY_ID = "intruder";
/** Labeled synthetic. Installed only when the demo seed is loaded — never production-empty. */
export const DEMO_OWNER_KEY = "wek_seedowner_synthetic-demo-owner-key-not-for-prod";
export const DEMO_INTRUDER_KEY = "wek_intruder_synthetic-demo-intruder-key-not-for-prod";

export interface IssuedAgentKey {
  token: string;
  keyId: string;
  scopes: AgentScope[];
  note: string;
}

export interface IdentitySnapshot {
  principals: Principal[];
  accounts: Account[];
  credentials: AgentCredential[];
  ownership: Ownership[];
  audit: WriteAudit[];
}

function nowIso(): string {
  return new Date().toISOString();
}

function id(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export class IdentityLedger {
  readonly principals = new Map<string, Principal>();
  readonly accounts = new Map<string, Account>();
  readonly credentials = new Map<string, AgentCredential>();
  readonly ownership: Ownership[] = [];
  readonly audit: WriteAudit[] = [];

  static empty(): IdentityLedger {
    return new IdentityLedger();
  }

  static fromSnapshot(snap: IdentitySnapshot): IdentityLedger {
    const ledger = new IdentityLedger();
    for (const p of snap.principals) ledger.principals.set(p.id, p);
    for (const a of snap.accounts) ledger.accounts.set(a.clerkUserId, a);
    for (const c of snap.credentials) ledger.credentials.set(c.keyId, c);
    ledger.ownership.push(...snap.ownership);
    ledger.audit.push(...snap.audit);
    return ledger;
  }

  /** All seeded entities belong to the labeled synthetic owner. Intruder key owns nothing. */
  static forSyntheticSeed(entityIds: string[]): IdentityLedger {
    const ledger = new IdentityLedger();
    const at = nowIso();
    ledger.principals.set(SYNTHETIC_OWNER_PRINCIPAL_ID, {
      id: SYNTHETIC_OWNER_PRINCIPAL_ID,
      kind: "agent",
      displayName: seedLabel("network"),
      synthetic: true,
      created_at: at,
      updated_at: at,
    });
    ledger.principals.set(SYNTHETIC_INTRUDER_PRINCIPAL_ID, {
      id: SYNTHETIC_INTRUDER_PRINCIPAL_ID,
      kind: "agent",
      displayName: "synthetic cross-tenant fixture — owns no seed entities",
      synthetic: true,
      created_at: at,
      updated_at: at,
    });
    ledger.installHashedKey(SYNTHETIC_OWNER_PRINCIPAL_ID, DEMO_OWNER_KEY_ID, DEMO_OWNER_KEY, [...AGENT_SCOPES], true);
    ledger.installHashedKey(SYNTHETIC_INTRUDER_PRINCIPAL_ID, DEMO_INTRUDER_KEY_ID, DEMO_INTRUDER_KEY, [...AGENT_SCOPES], true);
    for (const entityId of entityIds) {
      ledger.own(entityId, SYNTHETIC_OWNER_PRINCIPAL_ID, "owner");
    }
    return ledger;
  }

  snapshot(): IdentitySnapshot {
    return {
      principals: [...this.principals.values()],
      accounts: [...this.accounts.values()],
      credentials: [...this.credentials.values()],
      ownership: [...this.ownership],
      audit: [...this.audit],
    };
  }

  createPrincipal(input: {
    kind: Principal["kind"];
    displayName?: string;
    clerkUserId?: string;
    synthetic?: boolean;
    id?: string;
    ageAffirmedAt?: string;
    ageAffirmationVersion?: string;
  }): Principal {
    const at = nowIso();
    const principal: Principal = {
      id: input.id ?? id("principal"),
      kind: input.kind,
      displayName: input.displayName,
      clerkUserId: input.clerkUserId,
      synthetic: input.synthetic,
      ageAffirmedAt: input.ageAffirmedAt,
      ageAffirmationVersion: input.ageAffirmationVersion,
      created_at: at,
      updated_at: at,
    };
    this.principals.set(principal.id, principal);
    return principal;
  }

  upsertClerkHuman(clerkUserId: string, displayName?: string): Caller {
    const existing = [...this.principals.values()].find((p) => p.clerkUserId === clerkUserId);
    const principal =
      existing ??
      this.createPrincipal({
        kind: "human",
        clerkUserId,
        displayName: displayName ?? "human",
      });
    if (displayName && principal.displayName !== displayName) {
      principal.displayName = displayName;
      principal.updated_at = nowIso();
    }
    if (!this.accounts.has(clerkUserId)) {
      const account: Account = {
        id: id("acct"),
        principalId: principal.id,
        clerkUserId,
        created_at: nowIso(),
      };
      this.accounts.set(clerkUserId, account);
    }
    return {
      principalId: principal.id,
      kind: "human",
      clerkUserId,
      scopes: [...AGENT_SCOPES],
    };
  }

  own(entityId: string, principalId: string, role: Ownership["role"] = "owner"): Ownership {
    const found = this.ownership.find((o) => o.entityId === entityId && o.principalId === principalId);
    if (found) return found;
    const row: Ownership = { entityId, principalId, role, created_at: nowIso() };
    this.ownership.push(row);
    return row;
  }

  ownersOf(entityId: string): string[] {
    return this.ownership.filter((o) => o.entityId === entityId).map((o) => o.principalId);
  }

  owns(principalId: string, entityId: string): boolean {
    return this.ownership.some((o) => o.entityId === entityId && o.principalId === principalId);
  }

  entitiesOwnedBy(principalId: string): string[] {
    return this.ownership.filter((o) => o.principalId === principalId).map((o) => o.entityId);
  }

  isAgeAffirmed(principalId: string): boolean {
    return Boolean(this.principals.get(principalId)?.ageAffirmedAt);
  }

  affirmAge(principalId: string, version: string, at = nowIso()): Principal {
    const principal = this.principals.get(principalId);
    if (!principal) throw new AuthzError(403, "unknown principal");
    principal.ageAffirmedAt = principal.ageAffirmedAt ?? at;
    principal.ageAffirmationVersion = version;
    principal.updated_at = at;
    return principal;
  }

  assertOwns(caller: Caller | null | undefined, entityId: string): Caller {
    const who = requireCaller(caller);
    if (!this.owns(who.principalId, entityId)) {
      throw new AuthzError(403, "forbidden: not the owner");
    }
    return who;
  }

  issueKey(principalId: string, scopes: AgentScope[] = [...AGENT_SCOPES]): IssuedAgentKey {
    const principal = this.principals.get(principalId);
    if (!principal) throw new AuthzError(403, "unknown principal");
    if (principal.kind !== "agent") throw new AuthzError(403, "only agent principals receive API keys");
    const minted = mintAgentKey();
    this.installHashedKey(principalId, minted.keyId, minted.token, scopes, principal.synthetic === true);
    return {
      token: minted.token,
      keyId: minted.keyId,
      scopes,
      note: "Shown once. WhoElse stores only a hash. Rotate to replace.",
    };
  }

  installHashedKey(
    principalId: string,
    keyId: string,
    token: string,
    scopes: AgentScope[],
    _synthetic = false,
  ): AgentCredential {
    const at = nowIso();
    const cred: AgentCredential = {
      id: id("cred"),
      principalId,
      keyId,
      keyHash: hashAgentKey(token),
      scopes,
      created_at: at,
    };
    this.credentials.set(keyId, cred);
    return cred;
  }

  authenticateAgentKey(token: string): Caller | null {
    const parsed = parseAgentKey(token);
    if (!parsed) return null;
    const cred = this.credentials.get(parsed.keyId);
    if (!cred || cred.revoked_at) return null;
    if (!hashesEqual(cred.keyHash, hashAgentKey(token))) return null;
    const principal = this.principals.get(cred.principalId);
    if (!principal) return null;
    cred.last_used_at = nowIso();
    return {
      principalId: principal.id,
      kind: principal.kind,
      clerkUserId: principal.clerkUserId,
      scopes: cred.scopes,
      synthetic: principal.synthetic,
      keyId: cred.keyId,
    };
  }

  rotateKey(caller: Caller, keyId?: string): IssuedAgentKey {
    const existing = keyId
      ? this.credentials.get(keyId)
      : [...this.credentials.values()].find((c) => c.principalId === caller.principalId && !c.revoked_at);
    if (!existing) throw new AuthzError(403, "no active key to rotate");
    if (existing.principalId !== caller.principalId && caller.kind !== "human") {
      throw new AuthzError(403, "forbidden: not the owner");
    }
    if (caller.kind === "human" && !this.principals.get(existing.principalId)) {
      throw new AuthzError(403, "forbidden: not the owner");
    }
    if (existing.principalId !== caller.principalId && caller.kind === "human") {
      throw new AuthzError(403, "forbidden: not the owner");
    }
    existing.revoked_at = nowIso();
    existing.rotated_at = existing.revoked_at;
    return this.issueKey(existing.principalId, existing.scopes);
  }

  revokeKey(caller: Caller, keyId: string): AgentCredential {
    const cred = this.credentials.get(keyId);
    if (!cred) throw new AuthzError(403, "unknown key");
    if (cred.principalId !== caller.principalId) {
      throw new AuthzError(403, "forbidden: not the owner");
    }
    cred.revoked_at = nowIso();
    return cred;
  }

  recordAudit(entry: Omit<WriteAudit, "id" | "at"> & { id?: string; at?: string }): WriteAudit {
    const full: WriteAudit = {
      id: entry.id ?? id("audit"),
      at: entry.at ?? nowIso(),
      principalId: entry.principalId,
      action: entry.action,
      entityId: entry.entityId,
      publicationId: entry.publicationId,
      payload: entry.payload,
    };
    this.audit.push(full);
    return full;
  }
}
