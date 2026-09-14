import { parseUniversal } from "./parse.js";
import type {
  ActionType,
  AttributeConstraint,
  GeoLocation,
  WhoElseConstraints,
} from "./types.js";
import { matchVocabLabels, vocabByLabel, type IntentKind, type VocabHit } from "./vocab.js";

export type IntentEdgeKind = "parallel" | "depends" | "constrains" | "intersect" | "fallback" | "sequence";

export type CompoundAction = ActionType | "discover" | "coordinate" | "confirm";

export interface CompoundIntentRef {
  id: string;
  label: string;
  kind: IntentKind;
  category?: string;
  confidence: number;
  matched?: string;
}

export interface IntentEdge {
  from: string;
  to: string;
  kind: IntentEdgeKind;
}

export interface CompoundEntities {
  seeker?: string;
  target?: string;
}

export interface PermissionBoundary {
  mayContact: boolean;
  mayInvoke: boolean;
  mayPersist: boolean;
  note?: string;
}

export interface CompoundSlots {
  location?: GeoLocation & { nearby?: boolean; neighborhood?: string; radiusKm?: number };
  time?: { when?: string; phrase?: string };
  price?: AttributeConstraint;
  trust?: string;
}

export interface CompoundIR {
  /** Joined / primary phrase — degenerate single-intent keeps this as the find query. */
  intent: string;
  intents: CompoundIntentRef[];
  entities: CompoundEntities;
  hard: AttributeConstraint[];
  soft: {
    location?: CompoundSlots["location"];
    time?: CompoundSlots["time"];
    price?: AttributeConstraint;
    trust?: string;
    labels?: string[];
    relation?: string;
  };
  exclusions: string[];
  constraints: WhoElseConstraints;
  relations: IntentEdge[];
  actions: CompoundAction[];
  permissions: PermissionBoundary;
}

export interface ParseCompoundOptions {
  cities?: string[];
  places?: { neighborhood: string; city?: string; region?: string }[];
  intent?: string;
  exclusions?: string[];
}

const ROMANTIC = /\b(romantic(?:ally)?|romance|date|dating|might like|someone i like|go out with)\b/i;
const NEARBY = /\bnear me\b|\bnearby\b|\blocally\b|\bin town\b|\bsomewhere nearby\b/i;
const TONIGHT = /\btonight\b/;
const TOMORROW = /\btomorrow\b/;
const TODAY = /\btoday\b/;
const HUMAN = /\b(someone|somebody|a person|people|humans?|who to date)\b/i;
const AI_ONLY = /\b(an ai|ais\b|bots?\b|llms?\b)\b/i;
const DISCOVER = /\b(find|who else|looking for|discover)\b/i;
const COORDINATE = /\b(with someone|together|coordinate|plan|set up)\b/i;
const CONFIRM = /\b(confirm|book|reserve)\b/i;

function exclusionsFrom(text: string): string[] {
  const out: string[] = [];
  const instead = text.match(/\binstead of\s+([^,?!.]+)/i);
  if (instead) out.push(instead[1].trim());
  const except = text.match(/\b(?:except|excluding|not)\s+([^,?!.]+)/i);
  if (except && !/^who else\b/i.test(except[1])) out.push(except[1].trim());
  return out;
}

function inferEntities(text: string, hits: VocabHit[]): CompoundEntities {
  const wantsHuman = HUMAN.test(text) && !AI_ONLY.test(text);
  const dating = hits.some((h) => h.label === "DATE") || ROMANTIC.test(text);
  if (dating || wantsHuman) return { seeker: "human", target: "human" };
  if (AI_ONLY.test(text)) return { seeker: "human", target: "ai" };
  const entityHit = hits.find((h) => h.kind === "entity");
  if (entityHit) return { seeker: "human", target: entityHit.label.toLowerCase() };
  return { seeker: "human", target: hits[0]?.kind === "service" ? "service" : undefined };
}

function inferActions(text: string, hits: VocabHit[]): CompoundAction[] {
  const actions = new Set<CompoundAction>();
  if (DISCOVER.test(text) || hits.length > 0) actions.add("discover");
  if (COORDINATE.test(text) || (hits.length > 1 && hits.some((h) => h.label === "DATE"))) {
    actions.add("coordinate");
  }
  if (CONFIRM.test(text)) actions.add("confirm");
  if (/\bconnect\b/i.test(text)) actions.add("connect");
  if (/\bdelegate\b/i.test(text)) actions.add("delegate");
  return [...actions];
}

function inferTime(text: string): CompoundSlots["time"] | undefined {
  const lower = text.toLowerCase();
  if (TONIGHT.test(lower)) return { when: "tonight", phrase: "tonight" };
  if (TOMORROW.test(lower)) return { when: "tomorrow", phrase: "tomorrow" };
  if (TODAY.test(lower)) return { when: "today", phrase: "today" };
  const day = lower.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (day) return { when: day[1], phrase: day[1] };
  return undefined;
}

/**
 * Same-person social+activity → intersect.
 * Lodging after travel → sequence.
 * Place + nearby amenity → constrains.
 * Work + remote → constrains.
 * "or" / failover → fallback.
 * Otherwise parallel (then reconcile).
 */
export function inferIntentEdges(hits: CompoundIntentRef[], text: string): IntentEdge[] {
  if (hits.length < 2) return [];
  const labels = new Set(hits.map((h) => h.label));
  const byId = (label: string) => hits.find((h) => h.label === label)?.id;
  const edges: IntentEdge[] = [];

  const pair = (a: string, b: string, kind: IntentEdgeKind) => {
    const from = byId(a);
    const to = byId(b);
    if (from && to) edges.push({ from, to, kind });
  };

  if (labels.has("DATE") && labels.has("TENNIS")) pair("DATE", "TENNIS", "intersect");
  if (labels.has("APARTMENT") && labels.has("SCHOOL")) pair("SCHOOL", "APARTMENT", "constrains");
  if (labels.has("FLIGHT") && labels.has("HOTEL")) pair("FLIGHT", "HOTEL", "sequence");
  if (labels.has("JOB") && labels.has("REMOTE WORK")) pair("REMOTE WORK", "JOB", "constrains");

  if (/\bor\b|\bif that fails|\bfallback|\binstead\b/i.test(text) && hits.length >= 2) {
    edges.push({ from: hits[0].id, to: hits[1].id, kind: "fallback" });
  }

  if (edges.length) return uniqueEdges(edges);

  const social = hits.filter((h) => h.label === "DATE" || h.kind === "need");
  const activity = hits.filter((h) => h.kind === "activity");
  if (social.length && activity.length) {
    for (const s of social) {
      for (const a of activity) {
        if (s.id !== a.id) edges.push({ from: s.id, to: a.id, kind: "intersect" });
      }
    }
    return uniqueEdges(edges);
  }

  const entities = hits.filter((h) => h.kind === "entity");
  if (entities.length >= 2 && /\bthen\b|\bafter\b|\band then\b/i.test(text)) {
    edges.push({ from: entities[0].id, to: entities[1].id, kind: "sequence" });
    return edges;
  }
  if (entities.length >= 2) {
    edges.push({ from: entities[0].id, to: entities[1].id, kind: "constrains" });
    return edges;
  }

  for (let i = 1; i < hits.length; i++) {
    edges.push({ from: hits[0].id, to: hits[i].id, kind: "parallel" });
  }
  return edges;
}

function uniqueEdges(edges: IntentEdge[]): IntentEdge[] {
  const seen = new Set<string>();
  return edges.filter((e) => {
    const key = `${e.from}|${e.to}|${e.kind}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toRefs(hits: VocabHit[]): CompoundIntentRef[] {
  return hits.map((h) => ({
    id: h.id,
    label: h.label,
    kind: h.kind,
    category: h.category,
    confidence: h.confidence,
    matched: h.matched,
  }));
}

function forceLabels(labels: string[]): CompoundIntentRef[] {
  const refs: CompoundIntentRef[] = [];
  for (const label of labels) {
    const intent = vocabByLabel(label);
    if (!intent) continue;
    refs.push({
      id: intent.id,
      label: intent.label,
      kind: intent.kind,
      category: intent.category,
      confidence: 1,
      matched: "locked",
    });
  }
  return refs;
}

const CANONICAL_COMPOUND: { test: (t: string) => boolean; labels: string[] }[] = [
  {
    test: (t) =>
      /\btennis\b/i.test(t) &&
      (/\b(might like|romantically|date|dating)\b/i.test(t) || /\bsomeone\b/i.test(t)),
    labels: ["DATE", "TENNIS"],
  },
  {
    test: (t) => /\bapartment\b/i.test(t) && /\bschool\b/i.test(t),
    labels: ["APARTMENT", "SCHOOL"],
  },
  {
    test: (t) => /\bflight\b/i.test(t) && /\bhotel\b/i.test(t),
    labels: ["FLIGHT", "HOTEL"],
  },
  {
    test: (t) => /\b(job|role|hiring)\b/i.test(t) && /\bremote\b/i.test(t),
    labels: ["JOB", "REMOTE WORK"],
  },
];

export function parseCompound(text: string, opts: ParseCompoundOptions = {}): CompoundIR {
  const raw = text.trim();
  const q = parseUniversal(raw || " ", opts.cities ?? [], undefined, opts.places ?? []);
  const exclusions = opts.exclusions ?? exclusionsFrom(raw);
  let hits = matchVocabLabels(raw);

  for (const rule of CANONICAL_COMPOUND) {
    if (rule.test(raw)) {
      const byId = new Map(hits.map((h) => [h.id, h]));
      for (const f of forceLabels(rule.labels)) {
        byId.set(f.id, {
          id: f.id,
          label: f.label,
          kind: f.kind,
          category: f.category ?? "",
          confidence: 1,
          matched: f.matched ?? "locked",
        });
      }
      hits = [...byId.values()].sort((a, b) => b.confidence - a.confidence);
      break;
    }
  }

  const refs = toRefs(hits);
  const time = inferTime(raw);
  const nearby = NEARBY.test(raw);
  const location: CompoundSlots["location"] | undefined = q.soft.city || nearby || q.soft.neighborhood
    ? {
        city: q.soft.city,
        region: q.soft.region,
        neighborhood: q.soft.neighborhood,
        nearby: nearby || undefined,
        radiusKm: q.soft.radiusKm,
      }
    : undefined;
  const price = q.hard.find((a) => ["rent", "budget", "price", "rate"].includes(a.key));
  const relations = inferIntentEdges(refs, raw);
  const intent = opts.intent ?? (raw || "");

  const hard = [...q.hard];
  if (time?.when && !hard.some((a) => a.key === "when")) {
    hard.push({ key: "when", op: "eq", value: time.when });
  }

  const constraints: WhoElseConstraints = {
    type: q.entityType ?? (refs.some((r) => r.label === "DATE") ? "human" : undefined),
    city: q.soft.city,
    region: q.soft.region,
    neighborhood: q.soft.neighborhood,
    side: q.side,
    roles: q.roles,
    attributes: hard.length ? hard : undefined,
    radiusKm: q.soft.radiusKm,
  };

  const entities = inferEntities(raw, hits);
  if (entities.target === "human" && !constraints.type) constraints.type = "human";

  return {
    intent,
    intents: refs,
    entities,
    hard,
    soft: {
      location,
      time,
      price,
      relation: ROMANTIC.test(raw) ? "romantic" : q.relation,
      labels: q.soft.labels,
    },
    exclusions,
    constraints,
    relations,
    actions: inferActions(raw, hits),
    permissions: {
      mayContact: false,
      mayInvoke: false,
      mayPersist: false,
      note: "Find is side-effect free. Confirm / connect are later ACT steps.",
    },
  };
}

export function isCompound(ir: CompoundIR): boolean {
  return ir.intents.length > 1;
}

export function composedFrom(ir: CompoundIR): string[] {
  return ir.intents.map((i) => i.label);
}
