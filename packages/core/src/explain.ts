import type { Entity } from "./types.js";
import { sharedLabels } from "./text.js";
import { stringList } from "./store.js";

const LABEL_KEYS = [
  "interests",
  "skills",
  "lookingFor",
  "vibe",
  "occupation",
  "persona",
];

export function labelsOf(entity: Entity): string[] {
  return stringList(entity, ...LABEL_KEYS);
}

export function buildExplanation(opts: {
  entity: Entity;
  contextEntity?: Entity;
  query: string;
  sharedTerms: string[];
  locationMatch: boolean;
}): { why: string; commonalities: string[]; surprisingDifference?: string } {
  const { entity, contextEntity, sharedTerms, locationMatch } = opts;
  const self = labelsOf(entity);
  const other = contextEntity ? labelsOf(contextEntity) : inferQueryLabels(opts.query);
  const common = uniqueCap([
    ...sharedLabels(self, other),
    ...sharedTerms.filter((t) => t.includes(" ") || t.length > 5).slice(0, 4),
    ...(locationMatch && entity.location?.city
      ? [`${entity.location.city}${entity.location.region ? `, ${entity.location.region}` : ""}`]
      : []),
  ]).slice(0, 5);

  const whyBits: string[] = [];
  if (common.length) whyBits.push(`shares ${common.slice(0, 3).join(", ")}`);
  if (entity.type === "ai") {
    const cap = entity.capabilities.slice(0, 2);
    if (cap.length) whyBits.push(`AI skills: ${cap.join(", ")}`);
  } else if (occupation(entity)) {
    whyBits.push(occupation(entity)!);
  }
  if (locationMatch && entity.location?.city) {
    whyBits.push(`same city (${entity.location.city})`);
  }
  const why =
    whyBits.length > 0
      ? `${entity.name} ${whyBits.join(" · ")}`
      : `${entity.name} is a nearby match on intent text`;

  const surprising = surprisingDifference(entity, new Set(other.map((s) => s.toLowerCase())));
  return {
    why,
    commonalities: common.length ? common : sharedTerms.slice(0, 3),
    surprisingDifference: surprising,
  };
}

function occupation(entity: Entity): string | undefined {
  const value = entity.attributes.occupation ?? entity.attributes.persona;
  return typeof value === "string" ? value : undefined;
}

function inferQueryLabels(query: string): string[] {
  return query
    .split(/[,/;]| and | with /i)
    .map((s) => s.replace(/who else\??/i, "").trim())
    .filter((s) => s.length > 2 && s.length < 48);
}

function surprisingDifference(entity: Entity, known: Set<string>): string | undefined {
  const extras = labelsOf(entity).filter((label) => !known.has(label.toLowerCase()));
  const pick =
    extras.find((label) => !/synthetic|demo|ai/i.test(label)) ??
    (typeof entity.attributes.funFact === "string" ? entity.attributes.funFact : undefined);
  if (!pick) return undefined;
  return entity.type === "ai"
    ? `Unlike the request, ${entity.name} is an AI — and also brings ${pick}`
    : `Also into ${pick}, which the query did not ask for`;
}

function uniqueCap(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}
