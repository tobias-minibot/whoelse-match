import { AuthzError, type Caller } from "./authz.js";
import type { WhoElseNetwork } from "./network.js";
import type { Entity, PublicationInput, PublicationSpec } from "./types.js";
import {
  AGE_AFFIRMATION_TEXT,
  AGE_AFFIRMATION_VERSION,
  isPubliclyFindable,
  visibilityOf,
  type Visibility,
} from "./visibility.js";

export const DEFAULT_HUMAN_SEEK: PublicationSpec = {
  kind: "seek",
  capability: "romantic compatibility",
  phrases: ["dating", "compatible partner", "people to meet"],
};

export interface OnboardSpec {
  name: string;
  description: string;
  offers?: PublicationInput[];
  seeks?: PublicationInput[];
  publications?: PublicationSpec[];
  location?: Entity["location"];
  availability?: string;
  /** When true, store the current affirmation version and publish the profile. */
  affirmAge?: boolean;
}

export interface OnboardState {
  principalId: string;
  entity: Entity | null;
  visibility: Visibility | null;
  ageAffirmed: boolean;
  findable: boolean;
  needsOnboarding: boolean;
  affirmation: { version: string; text: string };
}

export function ownedHumanEntity(network: WhoElseNetwork, principalId: string): Entity | undefined {
  for (const id of network.identity.entitiesOwnedBy(principalId)) {
    const entity = network.engine.store.get(id);
    if (entity?.type === "human") return entity;
  }
  return undefined;
}

export function onboardState(network: WhoElseNetwork, caller: Caller): OnboardState {
  const principal = network.identity.principals.get(caller.principalId);
  const entity = ownedHumanEntity(network, caller.principalId) ?? null;
  const pubs = entity?.publications ?? [];
  return {
    principalId: caller.principalId,
    entity,
    visibility: entity ? visibilityOf(entity) : null,
    ageAffirmed: Boolean(principal?.ageAffirmedAt) || Boolean(entity?.metadata.ageAffirmed),
    findable: entity ? isPubliclyFindable(entity) : false,
    needsOnboarding: !entity || pubs.length === 0 || !entity.name.trim() || !entity.description.trim(),
    affirmation: { version: AGE_AFFIRMATION_VERSION, text: AGE_AFFIRMATION_TEXT },
  };
}

export function parseOnboardPublications(spec: OnboardSpec): PublicationSpec[] {
  const fromBags: PublicationSpec[] = [
    ...(spec.publications ?? []),
    ...asSpecs("offer", spec.offers),
    ...asSpecs("seek", spec.seeks),
  ].filter((p) => p.capability.trim());
  return fromBags;
}

function asSpecs(kind: "offer" | "seek", items?: PublicationInput[]): PublicationSpec[] {
  if (!items?.length) return [];
  return items.map((item) => {
    if (typeof item === "string") return { kind, capability: item };
    const capability = ("capability" in item && item.capability) || item.phrases?.[0] || "";
    return { ...item, kind: "kind" in item && item.kind ? item.kind : kind, capability };
  });
}

export function stampHumanLabels(entity: Entity): Entity {
  return {
    ...entity,
    type: "human",
    provenance: "user",
    attributes: {
      ...entity.attributes,
      kind: "human",
      registered: true,
    },
    metadata: {
      ...entity.metadata,
      kindLabel: "human",
      humanNotAi: true,
      demo: false,
      demoLabel: undefined,
      aiDisclosure: undefined,
      vertical: entity.metadata.vertical,
    },
  };
}

export function requireHumanCaller(caller: Caller): Caller {
  if (caller.kind !== "human") {
    throw new AuthzError(403, "human onboarding is for signed-in humans");
  }
  return caller;
}
