import { AMAZE_PROMPTS, amazeBySlug, parseShareParams, sharePath } from "@whoelse/core/amaze";

export { AMAZE_PROMPTS, amazeBySlug, parseShareParams, sharePath };

export function absoluteShareUrl(
  query: string,
  opts: { entityId?: string; costume?: string; origin?: string } = {},
): string {
  const origin = (opts.origin ?? (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/$/, "");
  return `${origin}${sharePath(query, { entityId: opts.entityId, costume: opts.costume })}`;
}
