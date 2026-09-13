import { persistIdentity, type Caller, type WhoElseNetwork } from "@whoelse/core";

function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!header) return null;
  const match = /^Bearer\s+(\S+)/i.exec(header.trim());
  return match?.[1] ?? null;
}

/**
 * Clerk session (humans) or hashed agent API key (Bearer).
 * Clerk is skipped when CLERK_SECRET_KEY is unset so `next build` / local demo still boot.
 * First Clerk session upserts a human principal and persists it when Neon is attached.
 */
export async function resolveCaller(req: Request, network: WhoElseNetwork): Promise<Caller | null> {
  const token = bearerToken(req);
  if (token) return network.authenticateAgentKey(token);

  if (!process.env.CLERK_SECRET_KEY) return null;
  try {
    const { auth, currentUser } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    if (!userId) return null;
    let displayName: string | undefined;
    try {
      const user = await currentUser();
      displayName =
        user?.fullName?.trim() ||
        [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
        user?.username ||
        undefined;
    } catch {
      displayName = undefined;
    }
    const existed = [...network.identity.principals.values()].some((p) => p.clerkUserId === userId);
    const caller = network.identity.upsertClerkHuman(userId, displayName);
    if (!existed) await persistIdentity(network);
    return caller;
  } catch {
    return null;
  }
}
