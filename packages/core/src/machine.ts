import { offersOf, seeksOf } from "./store.js";
import type { Candidate, Entity, WhoElseResult } from "./types.js";

export interface MachineNextStep {
  action: "chat" | "record_interest" | "invoke" | "open";
  via: string;
  capability?: string;
  note: string;
}

export interface MachineMatch {
  id: string;
  type: string;
  name: string;
  description: string;
  score: number;
  why: string;
  commonalities: string[];
  attributes: {
    offers: string[];
    seeks: string[];
    availability?: string;
    location?: Entity["location"];
    owner?: unknown;
    role?: unknown;
    bedrooms?: unknown;
    rent?: unknown;
    budget?: unknown;
    price?: unknown;
    currency?: unknown;
    furnished?: unknown;
    pets?: unknown;
    availableFrom?: unknown;
    availableTo?: unknown;
    neighborhood?: unknown;
    listingKind?: unknown;
    amenities?: unknown;
    durationMonths?: unknown;
    durationWeeks?: unknown;
    roleTitle?: unknown;
    rate?: unknown;
    salary?: unknown;
    start?: unknown;
    seats?: unknown;
    origin?: unknown;
    destination?: unknown;
    state?: unknown;
    licensed?: unknown;
    urgency?: unknown;
    trade?: unknown;
    fallbackTo?: unknown;
    latencyMs?: unknown;
    priceUsd?: unknown;
    tools?: unknown;
    permissions?: unknown;
    pricing?: unknown;
    latency?: unknown;
    reliability?: unknown;
    reputation?: unknown;
    contextAccess?: unknown;
    geoLegal?: unknown;
    endpoint?: unknown;
    apiEndpoint?: unknown;
    mcpEndpoint?: unknown;
    authRequirements?: unknown;
  };
  trust: {
    status: string;
    provenance: string;
    notes?: string;
    evidence?: Entity["trust"] extends { evidence?: infer E } ? E : unknown;
  };
  next: MachineNextStep;
}

export interface MachineFindResult {
  query: string;
  mode: string;
  usedOpenAiRerank: boolean;
  matches: MachineMatch[];
}

export function toMachineMatch(candidate: Candidate): MachineMatch {
  const e = candidate.entity;
  const attrs = e.attributes ?? {};
  return {
    id: e.id,
    type: e.type,
    name: e.name,
    description: e.description,
    score: Number(candidate.score.toFixed(4)),
    why: candidate.explanation.why,
    commonalities: candidate.explanation.commonalities,
    attributes: {
      offers: offersOf(e),
      seeks: seeksOf(e),
      availability: e.availability,
      location: e.location,
      role: attrs.role,
      bedrooms: attrs.bedrooms,
      rent: attrs.rent,
      budget: attrs.budget,
      price: attrs.price ?? attrs.rent,
      currency: attrs.currency,
      furnished: attrs.furnished,
      pets: attrs.pets,
      availableFrom: attrs.availableFrom,
      availableTo: attrs.availableTo,
      neighborhood: attrs.neighborhood,
      listingKind: attrs.listingKind,
      amenities: attrs.amenities,
      durationMonths: attrs.durationMonths,
      durationWeeks: attrs.durationWeeks,
      roleTitle: attrs.roleTitle,
      rate: attrs.rate ?? attrs.priceUsd,
      salary: attrs.salary,
      start: attrs.start,
      seats: attrs.seats,
      origin: attrs.origin,
      destination: attrs.destination,
      state: attrs.state,
      licensed: attrs.licensed,
      urgency: attrs.urgency,
      trade: attrs.trade,
      fallbackTo: attrs.fallbackTo,
      latencyMs: attrs.latencyMs,
      priceUsd: attrs.priceUsd,
      owner: attrs.owner,
      tools: attrs.tools,
      permissions: attrs.permissions,
      pricing: attrs.pricing,
      latency: attrs.latency,
      reliability: attrs.reliability,
      reputation: attrs.reputation,
      contextAccess: attrs.contextAccess,
      geoLegal: attrs.geoLegal,
      endpoint: attrs.endpoint,
      apiEndpoint: attrs.apiEndpoint,
      mcpEndpoint: attrs.mcpEndpoint,
      authRequirements: attrs.authRequirements,
    },
    trust: {
      status: e.trust?.status ?? "unscored",
      provenance: e.trust?.provenance ?? e.provenance,
      notes: e.trust?.notes,
      ...(e.trust?.evidence ? { evidence: e.trust.evidence } : {}),
    },
    next: nextStep(e),
  };
}

export function toMachineFindResult(result: WhoElseResult): MachineFindResult {
  return {
    query: result.query,
    mode: result.inferredMode,
    usedOpenAiRerank: result.usedOpenAiRerank,
    matches: result.candidates.map(toMachineMatch),
  };
}

function nextStep(entity: Entity): MachineNextStep {
  if (entity.type === "human") {
    return {
      action: "record_interest",
      via: "POST /api/interest",
      note: "Human surface stub — no message is sent.",
    };
  }
  if (entity.type === "agent") {
    const attrs = entity.attributes ?? {};
    const via = String(attrs.apiEndpoint ?? attrs.endpoint ?? `/api/agents/${entity.id}/invoke`);
    return {
      action: "invoke",
      via: `POST ${via}`,
      capability: offersOf(entity)[0],
      note: "Demo invoke stub — structured 'I would do X', not real execution.",
    };
  }
  if (entity.type === "ai") {
    return {
      action: "chat",
      via: "POST /api/chat",
      capability: offersOf(entity)[0],
      note: "Labeled AI chat stub. Never treat as a human.",
    };
  }
  return {
    action: "open",
    via: "stub",
    note: `${entity.type} stub — no transaction or booking ran.`,
  };
}
