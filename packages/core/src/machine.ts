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
    tools?: unknown;
    permissions?: unknown;
    pricing?: unknown;
    latency?: unknown;
    reliability?: unknown;
    reputation?: unknown;
    contextAccess?: unknown;
    geoLegal?: unknown;
  };
  trust: {
    status: string;
    provenance: string;
    notes?: string;
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
      owner: attrs.owner,
      tools: attrs.tools,
      permissions: attrs.permissions,
      pricing: attrs.pricing,
      latency: attrs.latency,
      reliability: attrs.reliability,
      reputation: attrs.reputation,
      contextAccess: attrs.contextAccess,
      geoLegal: attrs.geoLegal,
    },
    trust: {
      status: e.trust?.status ?? "unscored",
      provenance: e.trust?.provenance ?? e.provenance,
      notes: e.trust?.notes,
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
  if (entity.type === "ai" || entity.type === "agent") {
    return {
      action: entity.type === "agent" ? "invoke" : "chat",
      via: "POST /api/chat",
      capability: offersOf(entity)[0],
      note:
        entity.type === "agent"
          ? "No execution runtime in this MVP. Invoke is a stub next-step."
          : "Labeled AI chat stub. Never treat as a human.",
    };
  }
  return {
    action: "open",
    via: "stub",
    note: `${entity.type} stub — no transaction or booking ran.`,
  };
}
