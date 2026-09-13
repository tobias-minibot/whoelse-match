/**
 * Production boots empty unless explicitly seeded.
 * Demo seed is labeled synthetic and never auto-loaded on Vercel production.
 */

export type SeedMode = "demo" | "empty";

export function resolveSeedMode(env: NodeJS.ProcessEnv = process.env): SeedMode {
  const explicit = (env.WHOELSE_SEED ?? "").trim().toLowerCase();
  if (explicit === "demo") return "demo";
  if (explicit === "off" || explicit === "empty" || explicit === "none") return "empty";
  if (env.VERCEL_ENV === "production") return "empty";
  if (env.NODE_ENV === "test") return "demo";
  if (env.NODE_ENV === "production" && env.VERCEL_ENV) return "empty";
  // Local `pnpm dev` keeps the labeled demo pool so dating/lenses still work.
  return "demo";
}

export function isProductionEmptyDefault(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.VERCEL_ENV === "production" || env.NODE_ENV === "production") && resolveSeedMode(env) === "empty";
}

export function seedLabel(kind: "human" | "ai" | "agent" | "network"): string {
  switch (kind) {
    case "human":
      return "synthetic human";
    case "ai":
      return "synthetic AI — not a human";
    case "agent":
      return "synthetic agent — DEMO credential, not a production worker";
    default:
      return "synthetic fixture — DEMO only";
  }
}
