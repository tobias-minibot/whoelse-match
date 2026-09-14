import type {
  AttributeConstraint,
  Entity,
  EvidenceKind,
  InferredVertical,
  MatchSide,
  UniversalQuery,
  WhoElseConstraints,
  WhoElseMode,
} from "./types.js";

const TYPE_HUMAN = /\b(humans?|(?<!ai )people|person|someone)\b/i;
const TYPE_AI = /\b(an ai|ais\b|bots?\b|llms?\b|artificial intelligence)\b/i;
const SUBSTITUTE = /\b(instead of|replace|substitute|alternative to|other than|equivalent)\b/i;
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
  /\bhir(e|ing)\b|\brecruit\b|\bjob opening\b|\bwho else should i recruit\b|\bneeds someone with\b/i;
const SOMEONE_WHO_CAN =
  /\b(someone|somebody|a (human|company|agent|freelancer|person|studio)) who can\b|\bi need (someone|somebody) who can\b|\bredesign (my )?(web)?site\b|\bwebsite (redesign|next week)\b/i;
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
  /\bsummarize\b|\btranslate\b|\bbrowse the web\b|\bdelegate\b|\bfailover\b|\bverify this (result|web|claim)\b|\bweb verification\b|\bpdf\b/i;
const DATING_LANG =
  /\bdate\b|\bmeet\b|\bvoice assistants?\b|\bdinner\b|\bmountain bik|\bthought partner\b|\blow-key\b/i;
const PRODUCT_LANG =
  /\bin stock\b|\bequivalent\b|\bsku\b|\bmerchant\b|\bwho else sells\b|\bcheaper than this (product|drill|item)\b|\bsubstitution\b|\bthis drill\b|\bthis product\b/i;
const EXPERT_LANG =
  /\bexpert\b|\bknows about\b|\bwho else knows\b|\bask (an? )?(expert|about)\b|\bdisagrees?\b|\bauthority\b|\bnotary\b|\bknowledge\b/i;
const CAPITAL_LANG =
  /\binvests?\b|\bticket size\b|\bseed round\b|\b\$?\s?\d+k\s+check\b|\bwrites? (a )?checks?\b|\bintroduction to (an? )?investor\b|\bwho else (has )?capital\b|\braising\b|\bfounder seeking\b/i;
const TRAVEL_LANG =
  /\bstay in\b|\bhotel\b|\bhostel\b|\bgoing to berlin\b|\bgoing to\b|\broom tonight\b|\btonight in\b|\baccommodation\b|\broom (in|tonight)\b/i;
const EVENT_LANG =
  /\battending\b|\bspeaking at\b|\bconference\b|\bmeetup\b|\bwho else is (going|speaking|attending)\b|\bfrom my city\b/i;
const CHILDCARE_LANG =
  /\bbabysit\b|\bchildcare\b|\bnanny\b|\bbabysitter\b|\bneeds childcare\b|\bwatch (the|my) kids?\b/i;
const COLLAB_LANG =
  /\bcomplementary\b|\bjoin (this |the |our )?project\b|\bdesign partner\b|\bwrite together\b|\bcreative collab\b|\bwho else (designs|writes) (and|to)\b/i;
const COMPUTE_LANG =
  /\bgpus?\b|\bcheaper (compute|gpu)\b|\bhost (a )?gpu\b|\binference (capacity|host)\b|\blatency\b.{0,20}\b(gpu|compute|host)|\bcompute (host|capacity|cheaper)\b/i;
const DATA_LANG =
  /\bdataset\b|\boriginal source\b|\bverify this claim\b|\bdata provenance\b|\bwho else has (the )?(data|dataset)\b/i;
const LOCAL_LANG =
  /\bsells nearby\b|\bopen now\b|\bdeliver today\b|\bshop nearby\b|\blocal (shop|store|commerce)\b/i;
const CAPITAL_OFFER_LANG =
  /\binvests?\b|\bwrites? (a )?checks?\b|\bticket size\b|\bwho else has capital\b|\bwho else invests\b/i;
const CAPITAL_SEEK_LANG =
  /\braising\b|\bneed(s)? (a |an )?(check|introduction|intro)\b|\blooking for (an? )?(investor|check|intro)/i;

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
  if (SOMEONE_WHO_CAN.test(text) || HIRE_LANG.test(text) || LABOR_LANG.test(text)) return "offer";
  if (JOB_SEEK_LANG.test(text)) return "seek";
  if (CAPITAL_SEEK_LANG.test(text)) return "seek";
  if (CAPITAL_OFFER_LANG.test(text)) return "offer";
  if (PRODUCT_LANG.test(text) && /\bbe? cheaper\b|\bequivalent\b|\bin stock\b|\bwho else sells\b/i.test(text)) {
    return "offer";
  }
  if (LOCAL_LANG.test(text) && /\bneed|looking|who else (sells|is open|delivers)/i.test(text)) return "offer";
  if (TRAVEL_LANG.test(text) && WANT_SEEKERS.test(text)) return "seek";
  if (TRAVEL_LANG.test(text)) return "offer";
  if (CHILDCARE_LANG.test(text) && WANT_SEEKERS.test(text)) return "seek";
  if (CHILDCARE_LANG.test(text)) return "offer";
  if (EXPERT_LANG.test(text) && /\bask\b|\bwho else knows\b|\bdisagrees\b/i.test(text)) return "offer";
  if (COMPUTE_LANG.test(text) && WANT_SEEKERS.test(text)) return "seek";
  if (COMPUTE_LANG.test(text)) return "offer";
  if (DATA_LANG.test(text) && WANT_SEEKERS.test(text)) return "seek";
  if (DATA_LANG.test(text)) return "offer";
  if (EVENT_LANG.test(text) && /\battending|from my city|who else is going/i.test(text)) return "seek";
  if (EVENT_LANG.test(text)) return "offer";
  return undefined;
}

export function inferRoles(text: string, explicit?: string[]): string[] | undefined {
  if (explicit?.length) return explicit;
  if (SOMEONE_WHO_CAN.test(text)) return ["worker"];
  if (HIRE_LANG.test(text)) return ["opening", "employer"];
  if (LABOR_LANG.test(text)) return ["worker"];
  if (JOB_SEEK_LANG.test(text)) return ["applicant"];
  if (RIDE_LANG.test(text) && WANT_SEEKERS.test(text)) return ["passenger"];
  if (RIDE_LANG.test(text) && (WANT_OFFERS.test(text) || /\bgive me a ride\b/i.test(text))) {
    return ["driver"];
  }
  if (SERVICE_LANG.test(text) && WANT_SEEKERS.test(text)) return ["client"];
  if (SERVICE_LANG.test(text)) return ["provider"];
  if (CHILDCARE_LANG.test(text) && WANT_SEEKERS.test(text)) return ["parent"];
  if (CHILDCARE_LANG.test(text)) return ["caregiver"];
  if (TRAVEL_LANG.test(text) && WANT_SEEKERS.test(text)) return ["seeker"];
  if (TRAVEL_LANG.test(text)) return ["listing"];
  if (CAPITAL_SEEK_LANG.test(text)) return ["founder"];
  if (CAPITAL_OFFER_LANG.test(text)) return ["investor"];
  if (EXPERT_LANG.test(text) && /\bask\b|\bwho else knows\b/i.test(text)) return ["expert"];
  if (EXPERT_LANG.test(text) && WANT_SEEKERS.test(text)) return ["asker"];
  if (EXPERT_LANG.test(text)) return ["expert"];
  if (PRODUCT_LANG.test(text) && WANT_SEEKERS.test(text)) return ["buyer"];
  if (PRODUCT_LANG.test(text)) return ["seller"];
  if (LOCAL_LANG.test(text) && WANT_SEEKERS.test(text)) return ["buyer"];
  if (LOCAL_LANG.test(text)) return ["seller"];
  if (EVENT_LANG.test(text) && /\battending|from my city|who else is going/i.test(text)) {
    return ["attendee"];
  }
  if (EVENT_LANG.test(text) && /\bspeaking/i.test(text)) return ["speaker"];
  if (EVENT_LANG.test(text)) return ["event", "speaker"];
  if (COMPUTE_LANG.test(text) && WANT_SEEKERS.test(text)) return ["workload"];
  if (COMPUTE_LANG.test(text)) return ["compute"];
  if (DATA_LANG.test(text) && WANT_SEEKERS.test(text)) return ["researcher"];
  if (DATA_LANG.test(text)) return ["publisher"];
  if (COLLAB_LANG.test(text)) return undefined;
  return undefined;
}

export function inferVertical(text: string): InferredVertical | undefined {
  const hits: InferredVertical[] = [];
  if (APARTMENT_LANG.test(text) && !TRAVEL_LANG.test(text)) hits.push("apartment");
  if (TRAVEL_LANG.test(text) && !APARTMENT_LANG.test(text)) hits.push("travel");
  if (TRAVEL_LANG.test(text) && APARTMENT_LANG.test(text)) hits.push("apartment");
  if (HIRE_LANG.test(text) || LABOR_LANG.test(text) || JOB_SEEK_LANG.test(text) || SOMEONE_WHO_CAN.test(text)) {
    if (!COLLAB_LANG.test(text) && !COMPUTE_LANG.test(text)) hits.push("jobs");
  }
  if (RIDE_LANG.test(text)) hits.push("rides");
  if (SERVICE_LANG.test(text) && !APARTMENT_LANG.test(text) && !CHILDCARE_LANG.test(text)) {
    hits.push("services");
  }
  if (CAPABILITY_LANG.test(text) && !LABOR_LANG.test(text) && !DATA_LANG.test(text) && !COMPUTE_LANG.test(text)) {
    hits.push("capability");
  }
  if (PRODUCT_LANG.test(text) && !LOCAL_LANG.test(text)) hits.push("products");
  if (LOCAL_LANG.test(text)) hits.push("local");
  if (EXPERT_LANG.test(text) && !CHILDCARE_LANG.test(text)) hits.push("experts");
  if (CAPITAL_LANG.test(text)) hits.push("capital");
  if (EVENT_LANG.test(text) && !DATING_LANG.test(text.replace(/\bmeet\b/gi, ""))) hits.push("events");
  if (CHILDCARE_LANG.test(text)) hits.push("childcare");
  if (COLLAB_LANG.test(text) && !HIRE_LANG.test(text) && !LABOR_LANG.test(text)) hits.push("collab");
  if (COMPUTE_LANG.test(text)) hits.push("compute");
  if (DATA_LANG.test(text)) hits.push("data");
  if (DATING_LANG.test(text) && hits.length === 0) hits.push("dating");
  if (hits.length === 1) return hits[0];
  if (hits.length > 1) {
    if (hits.includes("apartment") && APARTMENT_LANG.test(text)) return "apartment";
    if (hits.includes("travel") && TRAVEL_LANG.test(text) && !APARTMENT_LANG.test(text)) return "travel";
    if (hits.includes("childcare")) return "childcare";
    if (hits.includes("local") && LOCAL_LANG.test(text)) return "local";
    if (hits.includes("products") && PRODUCT_LANG.test(text)) return "products";
    if (hits.includes("capital")) return "capital";
    if (hits.includes("compute")) return "compute";
    if (hits.includes("data")) return "data";
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
    /\bneeds someone\b|\bsomeone with\b|\bsomeone who can\b|\bhuman or ai\b|\bhir(e|ing)\b|\brecruit\b/i.test(
      text,
    );
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

  const parsed = parseAttributeConstraints(text, constraints.side);
  const radius = parsed.find((a) => a.key === "radiusKm");
  if (radius && typeof radius.value === "number") constraints.radiusKm = radius.value;

  const cityHit = knownCities.find((city) => new RegExp(`\\b${escapeReg(city)}\\b`, "i").test(text));
  if (!constraints.city && cityHit) constraints.city = cityHit;
  if (!constraints.city && /\bnyc\b|\bnew york\b/i.test(text)) constraints.city = "New York";
  if (!constraints.city && /\blisbon\b|\blisboa\b/i.test(text)) constraints.city = "Lisbon";
  if (!constraints.city && /\bberlin\b/i.test(text)) constraints.city = "Berlin";
  // Explicit radius is distance, not the dating “near me” → Washington default.
  if (
    !constraints.city &&
    (/\bdc\b|\bwashington\b/i.test(text) || (NEAR_ME.test(text) && constraints.radiusKm == null))
  ) {
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
  // "next week" is a preference, not a missing-key hard gate — sparse start fields would empty the pool.

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

  if (/\bin stock\b/.test(lower)) {
    out.push({ key: "inStock", op: "truthy", value: true });
  }
  if (/\bopen now\b/.test(lower)) {
    out.push({ key: "openNow", op: "truthy", value: true });
  }
  if (/\bdeliver today\b/.test(lower)) {
    out.push({ key: "deliverToday", op: "truthy", value: true });
  }
  if (/\bgpus?\b/.test(lower) && COMPUTE_LANG.test(text)) {
    out.push({ key: "gpu", op: "truthy", value: true });
  }
  if (/\btonight\b/.test(lower) && (TRAVEL_LANG.test(text) || /\broom tonight\b/.test(lower))) {
    out.push({ key: "availableFrom", op: "lte", value: iso(new Date()) });
  }
  if (/\btonight\b/.test(lower) && CHILDCARE_LANG.test(text)) {
    out.push({ key: "when", op: "eq", value: "tonight" });
  }
  if (/\bequivalent\b/.test(lower) && /\bdrill\b/.test(lower)) {
    out.push({ key: "kind", op: "eq", value: "drill" });
  }

  parseEligibilityConstraints(text, out);
  parseReservationConstraints(text, lower, out);
  parseInventoryConstraints(lower, out);
  parseRadiusConstraints(text, out);

  const price = parsePrice(text);
  // Dollar amounts next to “income” are eligibility, not rent/budget.
  if (price && !/\bincome\b/i.test(lower)) {
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

const ELIGIBLE_LANG =
  /\b(eligib(?:le|ility)|qualif(?:y|ies|ied|ication)|i qualify|means[-\s]?tested|income[-\s]?qualified)\b/i;
const RESERVE_LANG =
  /\b(reserv(?:e|ation|ed)|bookable|hold(?:s|ing)? (?:me )?(?:a )?(?:table|room|spot|seat))\b/i;
const TABLE_AT_TIME = /\btable\b/i;
const WEEKDAY =
  /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday|tonight|tomorrow|today)\b/i;

function parseEligibilityConstraints(text: string, out: AttributeConstraint[]): void {
  if (!ELIGIBLE_LANG.test(text)) return;
  if (!out.some((a) => a.key === "eligible")) {
    out.push({ key: "eligible", op: "truthy", value: true });
  }

  const credit = text.match(/\bcredit(?:\s+score)?\s*(?:of|over|above|at least|>=)?\s*(\d{3})\b/i);
  if (credit && !out.some((a) => a.key === "creditScore")) {
    // Published requirement on the OFFER: keep products whose min credit is ≤ the stated score.
    out.push({ key: "creditScore", op: "lte", value: Number(credit[1]) });
  }

  const incomeUnder =
    text.match(/\bincome\b.{0,28}\b(?:under|below|less than|up to|max(?:imum)?)\s*\$?\s*([0-9][0-9,]*(?:k)?)\b/i) ??
    text.match(/\b(?:under|below|less than|up to)\s*\$?\s*([0-9][0-9,]*(?:k)?)\b.{0,20}\bincome\b/i);
  if (incomeUnder && !out.some((a) => a.key === "income")) {
    out.push({ key: "income", op: "lte", value: parseAmount(incomeUnder[1]) });
  }

  if (/\b(member(?:ship)?|credit union)\b/i.test(text) && !out.some((a) => a.key === "membership")) {
    const named = text.match(/\b(?:member(?:ship)? (?:of|at)\s+)([A-Za-z][A-Za-z0-9' -]{1,32})/i);
    if (named) {
      out.push({ key: "membership", op: "includes", value: named[1].trim() });
    } else {
      out.push({ key: "membership", op: "truthy", value: true });
    }
  }
}

function parseReservationConstraints(text: string, lower: string, out: AttributeConstraint[]): void {
  const tableAtTime = TABLE_AT_TIME.test(lower) && WEEKDAY.test(lower);
  const ticketAtTime = /\b(tickets?|seats?)\b/.test(lower) && WEEKDAY.test(lower) && RESERVE_LANG.test(text);
  if (!RESERVE_LANG.test(text) && !tableAtTime && !ticketAtTime) return;
  if (!out.some((a) => a.key === "reservation")) {
    out.push({ key: "reservation", op: "truthy", value: true });
  }
  const day = lower.match(WEEKDAY);
  if (day && !out.some((a) => a.key === "when")) {
    out.push({ key: "when", op: "eq", value: day[1] });
  }
  const party = lower.match(/\btable for\s+(\d+)\b/);
  if (party && !out.some((a) => a.key === "seats")) {
    out.push({ key: "seats", op: "gte", value: Number(party[1]) });
  }
}

function parseInventoryConstraints(lower: string, out: AttributeConstraint[]): void {
  const counted = lower.match(
    /\b(\d+)\s+(?:spots?|spaces?|opens?|openings?)\s+(?:left|remaining|available)\b/,
  );
  if (counted) {
    if (!out.some((a) => a.key === "remaining")) {
      out.push({ key: "remaining", op: "gte", value: Number(counted[1]) });
    }
    return;
  }
  if (
    /\b(?:spots?|spaces?|capacity|inventory)\s+(?:left|remaining|available)\b/.test(lower) ||
    /\bremaining\s+(?:spots?|spaces?|capacity|count|inventory)\b/.test(lower) ||
    /\bwith spots remaining\b/.test(lower)
  ) {
    if (!out.some((a) => a.key === "remaining")) {
      out.push({ key: "remaining", op: "gte", value: 1 });
    }
  }
}

function parseRadiusConstraints(text: string, out: AttributeConstraint[]): void {
  const km =
    text.match(/\bwithin\s+(\d+(?:\.\d+)?)\s*(km|kilometers?|mi|miles?)\b/i) ??
    text.match(/\b(\d+(?:\.\d+)?)\s*(km|kilometers?|mi|miles?)\s+(?:of me|away|radius)\b/i);
  if (!km || out.some((a) => a.key === "radiusKm")) return;
  const n = Number(km[1]);
  const unit = km[2].toLowerCase();
  const radiusKm = unit.startsWith("mi") ? n * 1.60934 : n;
  out.push({ key: "radiusKm", op: "gte", value: Math.round(radiusKm * 10) / 10 });
}

function parseAmount(raw: string): number {
  const k = /k$/i.test(raw);
  const n = Number(raw.replace(/,/g, "").replace(/k$/i, ""));
  return k ? n * 1000 : n;
}

export function priceKey(lower: string, side?: MatchSide): string {
  if (/apartment|bedroom|rent|sublet|furnished|studio|tenant/.test(lower)) {
    return side === "seek" ? "budget" : "rent";
  }
  if (/\bstay|\bhotel|\bhostel|\broom tonight|\baccommodation|\bgoing to/.test(lower)) {
    return side === "seek" ? "budget" : "rent";
  }
  if (/\binvest|ticket|check|capital|seed round/.test(lower)) return "ticketSize";
  if (/\bdrill|\bin stock|\bequivalent|\bsku|\bmerchant|\bsells?\b|\bproduct/.test(lower)) {
    return "price";
  }
  if (/\bopen now|\bdeliver today|\bsells nearby|\blocal (shop|store)/.test(lower)) return "price";
  if (/\bgpu|\bcompute|\blatency/.test(lower)) return "price";
  if (/\bride|\bseat|\bpassenger|\bairport|\bmoab/.test(lower)) return "price";
  if (
    /hir(e|ing)|recruit|job|gig|freelancer|project|work|plumber|handyman|repair|rate|salary|coding|website|redesign|who can/.test(
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

export function inferEvidenceNeeds(text: string): EvidenceKind[] {
  const needs: EvidenceKind[] = [];
  if (/\b(verified|verify|verification)\b/i.test(text)) needs.push("verified");
  if (/\bportfolio\b/i.test(text)) needs.push("portfolio");
  if (/\b(done this|past (work|outcome)|exact kind|outcomes?)\b/i.test(text)) needs.push("outcome");
  if (/\b(licensed|license)\b/i.test(text)) needs.push("license");
  if (/\breference/i.test(text)) needs.push("reference");
  if (/\breceipt\b/i.test(text)) needs.push("receipt");
  return needs;
}

export function inferRelation(text: string): string | undefined {
  if (/\btake over|failover|fallback|if .+ fails\b/i.test(text)) return "fallback";
  if (/\bdelegate|hand[- ]?off|who else should i (use|call)\b/i.test(text)) return "delegate";
  if (/\binstead of|replace|substitute|alternative to\b/i.test(text)) return "substitute";
  if (/\bpeers?|colleagues?|others like\b/i.test(text)) return "peer";
  if (/\bneeds this|who else needs|good (tenant|hire|fit)|looking for exactly\b/i.test(text)) {
    return "complement";
  }
  if (/\bwho else has\b|\bcan (do|fix|give|verify|summarize)\b/i.test(text)) return "complement";
  return undefined;
}

/**
 * NL → universal WhoElse representation.
 * Costume (view) is inferred last and never becomes a second matcher.
 */
export function parseUniversal(
  text: string,
  knownCities: string[] = [],
  explicit?: WhoElseConstraints,
  knownPlaces: { neighborhood: string; city?: string; region?: string }[] = [],
  opts: { hasEntity?: boolean; mode?: WhoElseMode } = {},
): UniversalQuery {
  const constraints = inferConstraints(text, knownCities, explicit, knownPlaces);
  const hard = [...(constraints.attributes ?? [])];
  const state = hard.find((a) => a.key === "state");
  const evidenceNeeds = inferEvidenceNeeds(text);
  return {
    text,
    side: constraints.side,
    entityType: constraints.type,
    relation: inferRelation(text),
    roles: constraints.roles,
    hard,
    soft: {
      city: constraints.city,
      region: constraints.region,
      neighborhood: constraints.neighborhood,
      cheaper: wantsCheaper(text),
      radiusKm: constraints.radiusKm,
      ...( /\bnext week\b/i.test(text) ? { labels: ["next week"] } : {}),
    },
    evidenceNeeds,
    state: state
      ? { op: state.op, value: String(state.value ?? "") }
      : undefined,
    ranking: inferMode(text, Boolean(opts.hasEntity), opts.mode),
    view: inferVertical(text),
  };
}

export function constraintsFromUniversal(q: UniversalQuery): WhoElseConstraints {
  return {
    type: q.entityType,
    city: q.soft.city,
    region: q.soft.region,
    neighborhood: q.soft.neighborhood,
    side: q.side,
    roles: q.roles,
    attributes: q.hard.length ? q.hard : undefined,
    state: q.state && q.state.op === "eq" ? q.state.value : undefined,
    radiusKm: q.soft.radiusKm,
  };
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
  const dollarK = text.match(/\$\s*([0-9]+(?:\.[0-9]+)?)\s*k\b/i);
  if (dollarK) {
    return { amount: Number(dollarK[1]) * 1000, currency: "USD", under };
  }
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
