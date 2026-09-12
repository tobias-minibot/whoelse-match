import type {
  AttributeConstraint,
  Entity,
  MatchSide,
  WhoElseConstraints,
  WhoElseMode,
} from "./types.js";

const TYPE_HUMAN = /\b(humans?|people|person|someone)\b/i;
const TYPE_AI = /\b(an ai|ais\b|bots?\b|llms?\b|artificial intelligence)\b/i;
const SUBSTITUTE = /\b(instead of|replace|substitute|alternative to|other than)\b/i;
const PEERS = /\b(peers?|colleagues?|same role|others like them|fellow)\b/i;
const NEAR_ME = /\bnear me\b|\bnearby\b|\blocally\b|\bin town\b/i;

/** Find who HAS / provides the thing. */
const WANT_OFFERS =
  /\bwho else has\b|\bhas something\b|\bhas an?\b|\baccepts pets\b|\bwho else have\b|\bmatches these constraints\b/i;
/** Find who NEEDS / wants the thing. */
const WANT_SEEKERS =
  /\bwho else needs\b|\bwho else is looking\b|\bgood tenant\b|\bneeds what i have\b|\blooking for exactly\b|\bi have\b|\bwho else wants this\b|\bwho else might be\b/i;

const CHEAPER = /\bcheaper\b|\bless expensive\b|\bunder budget\b|\bbut cheaper\b/i;

export const DEFAULT_CITY = "Washington";
export const DEFAULT_REGION = "DC";

export function inferMode(text: string, hasEntity: boolean, explicit?: WhoElseMode): WhoElseMode {
  if (explicit) return explicit;
  if (SUBSTITUTE.test(text)) return "substitute";
  if (PEERS.test(text) || hasEntity) return hasEntity && !/\bwho else\b/i.test(text) ? "peers" : "expand";
  return "expand";
}

export function inferSide(text: string, explicit?: MatchSide): MatchSide | undefined {
  if (explicit) return explicit;
  const wantsSeekers = WANT_SEEKERS.test(text);
  const wantsOffers = WANT_OFFERS.test(text);
  if (wantsSeekers && !wantsOffers) return "seek";
  if (wantsOffers && !wantsSeekers) return "offer";
  if (wantsSeekers && wantsOffers) {
    if (/\bi have\b|\bgood tenant\b|\bneeds\b/i.test(text)) return "seek";
    return "offer";
  }
  return undefined;
}

export function inferConstraints(
  text: string,
  knownCities: string[],
  explicit?: WhoElseConstraints,
  knownPlaces: { neighborhood: string; city?: string; region?: string }[] = [],
): WhoElseConstraints {
  const constraints: WhoElseConstraints = {
    ...explicit,
    attributes: [...(explicit?.attributes ?? [])],
  };
  const wantsHuman = TYPE_HUMAN.test(text);
  const wantsAi = TYPE_AI.test(text);
  if (!constraints.type) {
    if (wantsHuman && !wantsAi) constraints.type = "human";
    else if (wantsAi && !wantsHuman) constraints.type = "ai";
  }

  if (!constraints.side) {
    const side = inferSide(text);
    if (side) constraints.side = side;
  }

  const cityHit = knownCities.find((city) => new RegExp(`\\b${escapeReg(city)}\\b`, "i").test(text));
  if (!constraints.city && cityHit) constraints.city = cityHit;
  if (!constraints.city && /\bnyc\b|\bnew york\b/i.test(text)) constraints.city = "New York";
  if (!constraints.city && /\blisbon\b|\blisboa\b/i.test(text)) constraints.city = "Lisbon";
  if (!constraints.city && /\bberlin\b/i.test(text)) constraints.city = "Berlin";
  if (!constraints.city && (/\bdc\b|\bwashington\b/i.test(text) || NEAR_ME.test(text))) {
    constraints.city = DEFAULT_CITY;
    constraints.region = constraints.region ?? DEFAULT_REGION;
  }

  if (/\bdc\b/i.test(text) && !constraints.region) constraints.region = DEFAULT_REGION;

  const placeHit = knownPlaces.find((p) => new RegExp(`\\b${escapeReg(p.neighborhood)}\\b`, "i").test(text));
  if (!constraints.neighborhood && placeHit) {
    constraints.neighborhood = placeHit.neighborhood;
    if (!constraints.city && placeHit.city) constraints.city = placeHit.city;
    if (!constraints.region && placeHit.region) constraints.region = placeHit.region;
  }

  const parsed = parseAttributeConstraints(text, constraints.side);
  for (const next of parsed) {
    if (!constraints.attributes!.some((a) => a.key === next.key && a.op === next.op)) {
      constraints.attributes!.push(next);
    }
  }
  if (constraints.attributes!.length === 0) delete constraints.attributes;

  return constraints;
}

export function parseAttributeConstraints(text: string, side?: MatchSide): AttributeConstraint[] {
  const out: AttributeConstraint[] = [];
  const lower = text.toLowerCase();

  const bedrooms = parseBedrooms(lower);
  if (bedrooms != null) out.push({ key: "bedrooms", op: "eq", value: bedrooms });

  if (/\bfurnished\b/.test(lower) && !/\bunfurnished\b/.test(lower)) {
    out.push({ key: "furnished", op: "truthy", value: true });
  } else if (/\bunfurnished\b/.test(lower)) {
    out.push({ key: "furnished", op: "eq", value: false });
  }

  if (/\b(pets? allowed|accepts pets|pet[-\s]?friendly|allows pets|accepts a pet)\b/.test(lower)) {
    out.push({ key: "pets", op: "truthy", value: true });
  } else if (/\bno pets\b/.test(lower)) {
    out.push({ key: "pets", op: "eq", value: false });
  }

  if (/\bsublet\b/.test(lower)) {
    out.push({ key: "listingKind", op: "eq", value: "sublet" });
  } else if (/\broom\b/.test(lower) && !/\brooms?\b/.test(lower.split("bedroom")[0] ?? "")) {
    if (/\b(a room|room in|has a room|need(s)? a room)\b/.test(lower)) {
      out.push({ key: "listingKind", op: "eq", value: "room" });
    }
  }

  const months = lower.match(/\b(three|3)[-\s]?months?\b/);
  if (months) out.push({ key: "durationMonths", op: "eq", value: 3 });

  if (/\bnext month\b/.test(lower)) {
    const { end } = nextMonthWindow();
    out.push({ key: "availableFrom", op: "lte", value: end });
  }

  const price = parsePrice(text);
  if (price) {
    if (price.currency) out.push({ key: "currency", op: "eq", value: price.currency });
    if (price.under || side !== "seek") {
      const key = side === "seek" ? "budget" : "rent";
      const op = price.under ? "lte" : side === "seek" ? "gte" : "lte";
      out.push({ key, op, value: price.amount });
    } else {
      // "I have … for $2200" / seek-side without "under" → seekers who can afford it
      out.push({ key: "budget", op: "gte", value: price.amount });
    }
  }

  return out;
}

export function wantsCheaper(text: string): boolean {
  return CHEAPER.test(text);
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
      fieldText(input.entity, "neighborhood"),
      fieldText(input.entity, "listingKind"),
      fieldText(input.entity, "amenities"),
      (input.entity.offers ?? input.entity.capabilities).join(" "),
      (input.entity.seeks ?? []).join(" "),
    );
    const a = input.entity.attributes ?? {};
    if (typeof a.bedrooms === "number") parts.push(`${a.bedrooms}-bedroom`);
    if (typeof a.rent === "number") parts.push(`${a.currency ?? ""} ${a.rent}`);
    if (a.furnished === true) parts.push("furnished");
    if (a.pets === true) parts.push("pets allowed");
  }
  return parts.filter(Boolean).join(" ");
}

function parseBedrooms(lower: string): number | undefined {
  if (/\bstudio\b/.test(lower)) return 0;
  if (/\b(one|1)[-\s]?bed/.test(lower)) return 1;
  if (/\b(two|2)[-\s]?bed/.test(lower)) return 2;
  if (/\b(three|3)[-\s]?bed/.test(lower)) return 3;
  return undefined;
}

function parsePrice(text: string): { amount: number; currency?: string; under: boolean } | undefined {
  const under = /\b(under|less than|below|up to|max(?:imum)?)\b/i.test(text);
  const dollar = text.match(/\$\s*([0-9][0-9,]*(?:\.[0-9]+)?)/);
  const euro = text.match(/€\s*([0-9][0-9,]*(?:\.[0-9]+)?)|\b([0-9][0-9,]*)\s*euros?\b/i);
  if (dollar) {
    return { amount: Number(dollar[1].replace(/,/g, "")), currency: "USD", under };
  }
  if (euro) {
    const raw = euro[1] ?? euro[2];
    return { amount: Number(raw.replace(/,/g, "")), currency: "EUR", under };
  }
  const bare = text.match(/\b(?:under|less than|below|up to)\s+([0-9][0-9,]{2,})/i);
  if (bare) {
    return { amount: Number(bare[1].replace(/,/g, "")), under: true };
  }
  return undefined;
}

function nextMonthWindow(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 0));
  return { start: iso(start), end: iso(end) };
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
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
