import type {
  AttributeConstraint,
  Entity,
  InferredVertical,
  MatchSide,
  WhoElseConstraints,
  WhoElseMode,
} from "./types.js";

const TYPE_HUMAN = /\b(humans?|(?<!ai )people|person|someone)\b/i;
const TYPE_AI = /\b(an ai|ais\b|bots?\b|llms?\b|artificial intelligence)\b/i;
const SUBSTITUTE = /\b(instead of|replace|substitute|alternative to|other than)\b/i;
const PEERS = /\b(peers?|colleagues?|same role|others like them|fellow)\b/i;
const NEAR_ME = /\bnear me\b|\bnearby\b|\blocally\b|\bin town\b/i;

/** Find who HAS / provides the thing. */
const WANT_OFFERS =
  /\bwho else has\b|\bhas something\b|\bhas an?\b|\baccepts pets\b|\bwho else have\b|\bmatches these constraints\b|\bwho else is hiring\b|\bis hiring\b|\bcan do this (work|job|task)\b|\bcan give me a ride\b|\bwho else can (fix|do|ship)\b/i;
/** Find who NEEDS / wants the thing. */
const WANT_SEEKERS =
  /\bwho else needs\b|\bwho else is looking\b|\bgood tenant\b|\bneeds what i have\b|\blooking for exactly\b|\bi have\b|\bwho else wants this\b|\bwho else might be\b|\bneeds someone\b|\bgood (hire|fit) for this\b/i;

const CHEAPER = /\bcheaper\b|\bless expensive\b|\bunder budget\b|\bbut cheaper\b/i;

const HIRE_LANG =
  /\bhir(e|ing)\b|\brecruit\b|\bjob opening\b|\bwho else should i recruit\b|\bneeds someone\b|\bneed someone\b/i;
const LABOR_LANG =
  /\bcan do this (work|job|task)\b|\bfreelancer\b|\bcoding project\b|\b(two|2|three|3)[-\s]?week (coding )?project\b|\bdone this exact\b|\bcan start immediately\b|\bhuman or ai\b|\bbetter fit but less obvious\b|\bavailable for a (two|2|three|3)/i;
const JOB_SEEK_LANG =
  /\blooking for (a |an )?(role|job|gig)\b|\bneed(s)? a job\b|\blooking for work\b|\bwho else is looking for a role\b/i;
const RIDE_LANG =
  /\brides?\b|\bseats?\b|\bpassenger\b|\bfrom [a-z][a-z .'-]{0,24} to [a-z]|\bto the airport\b|\bto moab\b/i;
const SERVICE_LANG =
  /\bplumber\b|\bhandyman\b|\bleak\b|\bsink\b|\blicensed\b|\bfix a leak\b|\brepair\b/i;
const APARTMENT_LANG =
  /\bapartment\b|\bbedroom\b|\bstudio\b|\bsublet\b|\btenant\b|\bfurnished\b|\bpets? allowed\b|\brent\b/i;
const CAPABILITY_LANG =
  /\bsummarize\b|\btranslate\b|\bbrowse the web\b|\bdelegate\b|\bfailover\b|\bverify this result\b|\bpdf\b/i;
const DATING_LANG =
  /\bdate\b|\bmeet\b|\bvoice assistants?\b|\bdinner\b|\bmountain bik|\bthought partner\b|\blow-key\b/i;

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
    if (/\bi have\b|\bgood tenant\b|\bneeds\b|\bgood (hire|fit)\b/i.test(text)) return "seek";
    return "offer";
  }
  if (HIRE_LANG.test(text) || LABOR_LANG.test(text)) return "offer";
  if (JOB_SEEK_LANG.test(text)) return "seek";
  return undefined;
}

export function inferRoles(text: string, explicit?: string[]): string[] | undefined {
  if (explicit?.length) return explicit;
  if (HIRE_LANG.test(text)) return ["opening", "employer"];
  if (LABOR_LANG.test(text)) return ["worker"];
  if (JOB_SEEK_LANG.test(text)) return ["applicant"];
  if (RIDE_LANG.test(text) && WANT_SEEKERS.test(text)) return ["passenger"];
  if (RIDE_LANG.test(text) && (WANT_OFFERS.test(text) || /\bgive me a ride\b/i.test(text))) {
    return ["driver"];
  }
  if (SERVICE_LANG.test(text) && WANT_SEEKERS.test(text)) return ["client"];
  if (SERVICE_LANG.test(text)) return ["provider"];
  return undefined;
}

export function inferVertical(text: string): InferredVertical | undefined {
  const hits: InferredVertical[] = [];
  if (APARTMENT_LANG.test(text)) hits.push("apartment");
  if (HIRE_LANG.test(text) || LABOR_LANG.test(text) || JOB_SEEK_LANG.test(text)) hits.push("jobs");
  if (RIDE_LANG.test(text)) hits.push("rides");
  if (SERVICE_LANG.test(text) && !APARTMENT_LANG.test(text)) hits.push("services");
  if (CAPABILITY_LANG.test(text) && !LABOR_LANG.test(text)) hits.push("capability");
  if (DATING_LANG.test(text) && hits.length === 0) hits.push("dating");
  if (hits.length === 1) return hits[0];
  if (hits.length > 1) {
    if (hits.includes("apartment") && APARTMENT_LANG.test(text)) return "apartment";
    if (hits.includes("jobs")) return "jobs";
    return hits[0];
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
  const someoneIsSlot =
    /\bneeds someone\b|\bsomeone with\b|\bhuman or ai\b|\bhir(e|ing)\b|\brecruit\b/i.test(text);
  if (!constraints.type) {
    if (wantsHuman && !wantsAi && !someoneIsSlot) constraints.type = "human";
    else if (wantsAi && !wantsHuman) constraints.type = "ai";
  }

  if (!constraints.side) {
    const side = inferSide(text);
    if (side) constraints.side = side;
  }

  if (!constraints.roles?.length) {
    const roles = inferRoles(text);
    if (roles) constraints.roles = roles;
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

  const weeks = parseWeeks(lower);
  if (weeks != null) out.push({ key: "durationWeeks", op: "eq", value: weeks });

  if (/\bnext month\b/.test(lower)) {
    const { end } = nextMonthWindow();
    out.push({ key: "availableFrom", op: "lte", value: end });
  }

  if (/\b(immediately|right away|can start now|start immediately)\b/.test(lower)) {
    out.push({ key: "start", op: "eq", value: "immediate" });
  }

  if (/\blicensed\b/.test(lower)) {
    out.push({ key: "licensed", op: "truthy", value: true });
  }

  if (/\b(emergency|urgent|asap|before the weekend)\b/.test(lower)) {
    out.push({ key: "urgency", op: "eq", value: "emergency" });
  }

  const seats = lower.match(/\b(\d+)\s+seats?\b/);
  if (seats) out.push({ key: "seats", op: "gte", value: Number(seats[1]) });

  const fromTo = text.match(
    /\bfrom\s+([A-Za-z][A-Za-z'-]{1,20}(?:\s+[A-Za-z][A-Za-z'-]{1,20}){0,2})\s+to\s+([A-Za-z][A-Za-z'-]{1,20}(?:\s+[A-Za-z][A-Za-z'-]{1,20}){0,2})(?:\s|$|,|\?)/i,
  );
  if (fromTo) {
    out.push({ key: "origin", op: "includes", value: fromTo[1].trim() });
    out.push({ key: "destination", op: "includes", value: fromTo[2].trim() });
  } else if (/\bto the airport\b/i.test(text)) {
    out.push({ key: "destination", op: "includes", value: "Airport" });
  } else if (/\bto moab\b/i.test(text)) {
    out.push({ key: "destination", op: "includes", value: "Moab" });
  }

  if (RIDE_LANG.test(text) && !/\bfull\b|\bcompleted\b/.test(lower)) {
    out.push({ key: "state", op: "neq", value: "completed" });
  }

  const price = parsePrice(text);
  if (price) {
    if (price.currency) out.push({ key: "currency", op: "eq", value: price.currency });
    const key = priceKey(lower, side);
    if (price.under || side !== "seek") {
      const op = price.under ? "lte" : side === "seek" ? "gte" : "lte";
      out.push({ key, op, value: price.amount });
    } else {
      out.push({ key: key === "rent" ? "budget" : key, op: "gte", value: price.amount });
    }
  }

  return out;
}

export function priceKey(lower: string, side?: MatchSide): string {
  if (/apartment|bedroom|rent|sublet|furnished|studio|tenant/.test(lower)) {
    return side === "seek" ? "budget" : "rent";
  }
  if (/\bride|\bseat|\bpassenger|\bairport|\bmoab/.test(lower)) return "price";
  if (
    /hir(e|ing)|recruit|job|gig|freelancer|project|work|plumber|handyman|repair|rate|salary|coding/.test(
      lower,
    )
  ) {
    return side === "seek" ? "budget" : "rate";
  }
  return side === "seek" ? "budget" : "rent";
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
      fieldText(input.entity, "skills"),
      fieldText(input.entity, "occupation"),
      fieldText(input.entity, "origin"),
      fieldText(input.entity, "destination"),
      fieldText(input.entity, "trade"),
      (input.entity.offers ?? input.entity.capabilities).join(" "),
      (input.entity.seeks ?? []).join(" "),
    );
    const a = input.entity.attributes ?? {};
    if (typeof a.bedrooms === "number") parts.push(`${a.bedrooms}-bedroom`);
    if (typeof a.rent === "number") parts.push(`${a.currency ?? ""} ${a.rent}`);
    if (typeof a.rate === "number") parts.push(`rate ${a.rate}`);
    if (typeof a.durationWeeks === "number") parts.push(`${a.durationWeeks}-week`);
    if (a.furnished === true) parts.push("furnished");
    if (a.pets === true) parts.push("pets allowed");
    if (a.start === "immediate") parts.push("start immediately");
    if (a.licensed === true) parts.push("licensed");
  }
  return parts.filter(Boolean).join(" ");
}

function parseWeeks(lower: string): number | undefined {
  if (/\b(two|2)[-\s]?weeks?\b/.test(lower)) return 2;
  if (/\b(three|3)[-\s]?weeks?\b/.test(lower)) return 3;
  return undefined;
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
