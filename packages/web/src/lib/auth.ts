import type { Caller, WhoElseNetwork } from "@whoelse/core";

function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!header) return null;
  const match = /^Bearer\s+(\S+)/i.exec(header.trim());
  return match?.[1] ?? null;
}

/**
 * Clerk session (humans) or hashed agent API key (Bearer).
 * Clerk is skipped when CLERK_SECRET_KEY is unset so `next build` / local demo still boot.
 */
export async function resolveCaller(req: Request, network: WhoElseNetwork): Promise<Caller | null> {
  const token = bearerToken(req);
  if (token) return network.authenticateAgentKey(token);

  if (!process.env.CLERK_SECRET_KEY) return null;
  try {
    const { auth } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    if (!userId) return null;
    return network.identity.upsertClerkHuman(userId);
  } catch {
    return null;
  }
}
