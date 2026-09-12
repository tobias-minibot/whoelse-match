import type { Entity, WhoElseConstraints, WhoElseMode } from "./types.js";

const TYPE_HUMAN = /\b(humans?|people|person|someone)\b/i;
const TYPE_AI = /\b(an ai|ais\b|bots?\b|llms?\b|artificial intelligence)\b/i;
const SUBSTITUTE = /\b(instead of|replace|substitute|alternative to|other than)\b/i;
const PEERS = /\b(peers?|colleagues?|same role|others like them|fellow)\b/i;
const NEAR_ME = /\bnear me\b|\bnearby\b|\blocally\b|\bin town\b/i;

export const DEFAULT_CITY = "Washington";
export const DEFAULT_REGION = "DC";

export function inferMode(text: string, hasEntity: boolean, explicit?: WhoElseMode): WhoElseMode {
  if (explicit) return explicit;
  if (SUBSTITUTE.test(text)) return "substitute";
  if (PEERS.test(text) || hasEntity) return hasEntity && !/\bwho else\b/i.test(text) ? "peers" : "expand";
  return "expand";
}

export function inferConstraints(
  text: string,
  knownCities: string[],
  explicit?: WhoElseConstraints,
): WhoElseConstraints {
  const constraints: WhoElseConstraints = { ...explicit };
  const wantsHuman = TYPE_HUMAN.test(text);
  const wantsAi = TYPE_AI.test(text);
  if (!constraints.type) {
    if (wantsHuman && !wantsAi) constraints.type = "human";
    else if (wantsAi && !wantsHuman) constraints.type = "ai";
  }

  const cityHit = knownCities.find((city) => new RegExp(`\\b${escapeReg(city)}\\b`, "i").test(text));
  if (!constraints.city && cityHit) constraints.city = cityHit;
  if (!constraints.city && (/\bdc\b|\bwashington\b/i.test(text) || NEAR_ME.test(text))) {
    constraints.city = DEFAULT_CITY;
    constraints.region = constraints.region ?? DEFAULT_REGION;
  }

  if (/\bdc\b/i.test(text) && !constraints.region) constraints.region = DEFAULT_REGION;
  return constraints;
}

export function queryText(input: {
  context: string;
  predicate?: string;
  entity?: Entity;
}): string {
  const parts = [input.context, input.predicate ?? ""];
  if (input.entity) {
    parts.push(
      input.entity.name,
      input.entity.description,
      fieldText(input.entity, "interests"),
      fieldText(input.entity, "skills"),
      fieldText(input.entity, "occupation"),
      fieldText(input.entity, "persona"),
      (input.entity.offers ?? input.entity.capabilities).join(" "),
      (input.entity.seeks ?? []).join(" "),
    );
  }
  return parts.filter(Boolean).join(" ");
}

function fieldText(entity: Entity, key: string): string {
  const value = entity.attributes[key] ?? entity.preferences[key];
  if (Array.isArray(value)) return value.join(" ");
  if (typeof value === "string") return value;
  return "";
}

function escapeReg(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
