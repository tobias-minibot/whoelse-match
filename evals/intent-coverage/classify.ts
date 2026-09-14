import { prettyLabel } from "./catalog.js";
import type { CoverageClass, ExpectedIR } from "./types.js";
import type { CatalogIntent } from "./types.js";

/**
 * A–E against the generic core:
 *   ENTITY (open type) + OFFER/SEEK publications + CONSTRAINT + MATCH
 * via whoelse.find / whoelse.compile.
 *
 * Constraint families now include eligible / reservation / remaining / radiusKm
 * as reusable keys (not bank.find or restaurant.find).
 */

export type Classified = {
  class: CoverageClass;
  reason: string;
  extension?: string;
  canonicalQuery: string;
  paraphrases: string[];
  expectedIr: ExpectedIR;
};

const OBSOLETE_SKU = new Set([
  "WATER",
  "TEA",
  "BEER",
  "COFFEE",
  "WINE",
  "SNACK",
  "COCKTAIL",
]);

const CONTENT_OR_PROCESS: Record<string, string> = {
  RECIPE: "Content object (instructions), not a counterparty OFFER/SEEK.",
  TRADITION: "Abstract cultural category — no entity to publish or match.",
  "NOTICE BOARD": "Bulletin content, not a find(compatible entities) request.",
  "LOST AND FOUND": "Lost-item inventory, not who-else matching.",
  KINSHIP: "Genealogical relation, not a publication on the shared network.",
  "CHILD SUPPORT": "Enforcement / court process — no clean SEEK↔OFFER pair.",
};

/** Missing reusable primitives. Prefer one extension over vertical logic. */
const ELIGIBILITY = new Set([
  "BANK",
  "SAVINGS",
  "LOAN",
  "INSURANCE",
  "INVESTMENT",
  "PENSION",
  "CRYPTO",
  "CREDIT SCORE",
  "WEALTH",
  "REMITTANCE",
  "SOCIAL HOUSING",
  "SCHOLARSHIP",
  "LEGAL AID",
  "PET INSURANCE",
  "ADOPTION",
  "FOSTER CARE",
  "SURROGACY",
]);

const RESERVATION = new Set([
  "RESTAURANT",
  "HOTEL",
  "HOSTEL",
  "SHORT STAY",
  "AIRBNB",
  "HOMESTAY",
  "RESORT",
  "CRUISE",
  "GLAMPING",
  "ECO LODGE",
  "FLIGHT",
  "CONCERT",
  "TICKET",
  "MOVIE",
  "ROOM BOOKING",
  "CAR RENTAL",
]);

const INVENTORY = new Set(["PARKING"]);

const GEO_RADIUS = new Set(["AMBULANCE", "FOOD DELIVERY", "BIKE MESSENGER"]);

const SLOT_LEAK: Record<string, string> = {
  "PERSONAL TRAINER": "Catalog wears a rideshare shirt (origin/destination). Remap to schedule/level.",
  "PALLIATIVE CARE": "Catalog wears a vehicle shirt. Remap to care service + schedule.",
  "HOME CARE": "Catalog wears a vehicle shirt. Remap to care service + schedule.",
  "ELDER CARE": "Catalog wears a vehicle shirt. Remap to care service + schedule.",
  "DEMENTIA CARE": "Catalog wears a vehicle shirt. Remap to care service + schedule.",
  WHEELCHAIR: "Catalog wears a beauty shirt (style). Remap to product + availability/price.",
  CARPENTER: "Catalog wears a vehicle shirt. Remap to trade service.",
  "CAR REPAIR": "Catalog wears a home-job shirt (property-type). Remap to repair service.",
  "BIKE REPAIR": "Catalog wears a home-job shirt. Remap to repair service.",
  GARAGE: "Catalog wears a trip shirt (origin/destination). Remap to place/service.",
  "CYCLE SHOP": "Catalog wears a trip shirt. Remap to shop/product.",
  MORTGAGE: "HOME geo shirt on a finance product. Remap to housing-cost find or finance eligibility.",
};

const SOCIAL_NORMALIZE = new Set([
  "FRIEND",
  "HANGOUT",
  "ACTIVITY PARTNER",
  "MATCHMAKER",
  "RELATIONSHIP",
  "DINING COMPANION",
  "TRAVEL COMPANION",
  "ACCOUNTABILITY PARTNER",
  "SPORTS BUDDY",
  "COWORKING BUDDY",
  "NEW IN TOWN",
  "HOST FAMILY",
]);

const RELATION_NORMALIZE: Record<string, string> = {
  FAILOVER: "Compile to RELATION fallback + whoelse.find — not a second matcher.",
  DELEGATE: "Compile to ACTION/RELATION delegate + find who can take the task.",
};

const JOB_HELP: Record<string, string> = {
  RESUME: "Normalize to jobs/experts: who else can write or review a resume.",
  INTERVIEW: "Normalize to jobs/experts: who else can help prepare or conduct interviews.",
};

function article(label: string): string {
  return /^[aeiou]/i.test(prettyLabel(label)) ? "an" : "a";
}

function capabilityOf(row: CatalogIntent): string {
  return prettyLabel(row.label);
}

function entityTypeOf(row: CatalogIntent): string | undefined {
  if (row.subgroup === "DIGITAL & TECH") return "agent";
  if (row.subgroup === "SOCIAL & COMMUNITY") return "human";
  if (row.subgroup === "WORK") return undefined;
  if (["FOOD & DRINK", "FASHION", "LOCAL"].includes(row.subgroup)) return "product";
  if (["EVENTS", "TRAVEL", "CULTURE"].includes(row.subgroup)) return "resource";
  return "service";
}

function sideOf(row: CatalogIntent): "offer" | "seek" {
  if (row.subgroup === "SOCIAL & COMMUNITY") return "seek";
  return "offer";
}

function canonicalQuery(row: CatalogIntent): string {
  const p = prettyLabel(row.label);
  const a = article(row.label);
  if (row.label === "DATE") return "Who else should I date?";
  if (row.label === "RIDESHARE" || row.label === "TAXI") return `Who else can give me a ride?`;
  if (row.label === "JOB") return "Who else is hiring?";
  if (row.label === "AI TOOLS") return "Who else can summarize this PDF?";
  if (row.label === "APARTMENT") return "Who else has a 1-bedroom apartment near me?";
  if (row.label === "RESTAURANT") return "Who else has a restaurant table Friday?";
  if (row.label === "PARKING") return "Who else has parking with spots remaining?";
  if (ELIGIBILITY.has(row.label) || (row.label === "MORTGAGE" && row.subgroup === "FINANCE")) {
    return `Who else has ${a} ${p} I qualify for?`;
  }
  if (RESERVATION.has(row.label)) return `Who else has a bookable ${p}?`;
  if (GEO_RADIUS.has(row.label)) return `Who else is ${a} ${p} within 5 km?`;
  if (row.subgroup === "DIGITAL & TECH") return `Who else can help with ${p}?`;
  if (row.subgroup === "SOCIAL & COMMUNITY") return `Who else wants ${a} ${p}?`;
  if (row.subgroup === "EVENTS") return `Who else is going to ${a} ${p}?`;
  if (["FOOD & DRINK", "FASHION", "PRODUCTS"].includes(row.subgroup) || row.label === "AIRBNB") {
    return `Who else has ${a} ${p}?`;
  }
  return `Who else is ${a} ${p} near me?`;
}

function paraphrases(row: CatalogIntent): string[] {
  const p = prettyLabel(row.label);
  const a = article(row.label);
  return [
    `${row.label} who else?`,
    `Looking for ${a} ${p}`,
    `Who else ${sideOf(row) === "seek" ? "wants" : "has"} ${a} ${p}?`,
    `Find me ${a} ${p}`,
  ];
}

function expectedIr(row: CatalogIntent, notes: string, family?: string): ExpectedIR {
  const constraints: Record<string, unknown> = {};
  if (row.routing === "geo-anchored") constraints.city = "(soft; infer from language or near-me default)";
  if (row.slots.includes("budget") || row.slots.includes("price") || row.slots.some((s) => s.endsWith("price"))) {
    constraints.price = "optional AttributeConstraint price|budget|rate";
  }
  if (row.slots.includes("availability") || row.slots.includes("schedule")) {
    constraints.availability = "soft phrase or availableFrom";
  }
  if (family === "eligibility") {
    constraints.eligible = "AttributeConstraint eligible (+ income|creditScore|membership)";
  }
  if (family === "reservation") {
    constraints.reservation = "AttributeConstraint reservation (bookable slot / hold); when optional";
  }
  if (family === "inventory") {
    constraints.remaining = "AttributeConstraint remaining (count, not inStock boolean)";
  }
  if (family === "geo-radius") {
    constraints.radiusKm = "WhoElseConstraints.radiusKm — distance, not city equality";
  }
  return {
    side: sideOf(row),
    capability: capabilityOf(row),
    entityType: entityTypeOf(row),
    constraints,
    notes,
  };
}

function finish(
  row: CatalogIntent,
  cls: CoverageClass,
  reason: string,
  extra?: { extension?: string; family?: string },
): Classified {
  const notes = extra?.extension
    ? `${reason} Missing reusable primitive: ${extra.extension}.`
    : reason;
  return {
    class: cls,
    reason,
    extension: extra?.extension,
    canonicalQuery: canonicalQuery(row),
    paraphrases: paraphrases(row),
    expectedIr: expectedIr(row, notes, extra?.family ?? extra?.extension),
  };
}

export function classifyIntent(row: CatalogIntent): Classified {
  // E first — catalog hygiene. Do not distort architecture for these rows.
  if (row.alias_of) {
    return finish(
      row,
      "E",
      `Duplicate/alias of ${row.alias_of}. Deprecate this ID; keep the canonical sentence.`,
    );
  }
  if (OBSOLETE_SKU.has(row.label)) {
    return finish(
      row,
      "E",
      "SKU-as-intent overgeneration. Deprecate the noun-as-ID; product find already covers the item.",
    );
  }

  const dReason = CONTENT_OR_PROCESS[row.label];
  if (dReason) return finish(row, "D", dReason);

  // Two-market finance mortgage (HOME mortgage stays B leak below).
  if (row.label === "MORTGAGE" && row.subgroup === "FINANCE") {
    return finish(
      row,
      "A",
      "Useful request is a product I qualify for. Representable as SEEK/OFFER + CONSTRAINT eligible (not a yellow-pages bank noun, not bank.find).",
      { family: "eligibility" },
    );
  }

  if (ELIGIBILITY.has(row.label)) {
    return finish(
      row,
      "A",
      "Useful match is who qualifies (income, credit, membership, status). Representable as CONSTRAINT eligible on the same whoelse.find.",
      { family: "eligibility" },
    );
  }
  if (RESERVATION.has(row.label)) {
    return finish(
      row,
      "A",
      "Useful match is who has a bookable unit at a time. Representable as CONSTRAINT reservation; ACTION book may follow but is not find.",
      { family: "reservation" },
    );
  }
  if (INVENTORY.has(row.label)) {
    return finish(
      row,
      "A",
      "Useful match is remaining capacity (spots). Representable as CONSTRAINT remaining — not boolean inStock, not parking.find.",
      { family: "inventory" },
    );
  }
  if (GEO_RADIUS.has(row.label)) {
    return finish(
      row,
      "A",
      "Useful match is distance/ETA, not city equality. Representable as CONSTRAINT radiusKm; near-me no longer forces Washington when a radius is stated.",
      { family: "geo-radius" },
    );
  }

  const leak = SLOT_LEAK[row.label];
  if (leak && !(row.label === "MORTGAGE" && row.subgroup === "FINANCE")) {
    return finish(row, "B", leak);
  }
  if (SOCIAL_NORMALIZE.has(row.label)) {
    return finish(
      row,
      "B",
      "DATE-family compatible-entity find. Alias to find(compatible entities) + when/where/vibe in the sentence.",
    );
  }
  const rel = RELATION_NORMALIZE[row.label];
  if (rel) return finish(row, "B", rel);
  const help = JOB_HELP[row.label];
  if (help) return finish(row, "B", help);
  if (row.label === "PAINTER ART") {
    return finish(row, "B", "Disambiguate from home PAINTER. Compile as creative/collab offer.");
  }
  if (row.label === "1ST AID") {
    return finish(row, "B", "Normalize label to first aid / emergency care service.");
  }
  if (row.label === "ATM") {
    return finish(row, "B", "Place find (who has an ATM). Drop the finance eligibility shirt.");
  }

  return finish(
    row,
    "A",
    `Noun-find on the generic core: SEEK/OFFER capability “${capabilityOf(row)}” + existing constraints (geo/price/availability/evidence). No new primitive.`,
  );
}

export function classifyAll(intents: CatalogIntent[]): Classified[] {
  return intents.map(classifyIntent);
}
