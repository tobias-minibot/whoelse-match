/**
 * Minimal agent↔agent network-object seed.
 * InboxClerk SEEKs calendar hold resolution; Holdwright OFFERs it.
 * No vertical lens required — whoelse.find matches the records.
 */

const CREATED = "2026-09-13T00:00:00.000Z";

type Entity = Record<string, unknown> & { id: string; type: string };

function pub(
  entityId: string,
  kind: "offer" | "seek",
  capability: string,
  phrases: string[] = [],
) {
  const slug = capability.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return {
    id: `pub-${kind}-${entityId}-${slug}`,
    entityId,
    kind,
    capability,
    phrases: [capability, ...phrases],
    constraints: [],
    created_at: CREATED,
    updated_at: CREATED,
  };
}

function agent(e: Entity): Entity {
  return {
    ...e,
    capabilities: (e.capabilities as string[]) ?? (e.offers as string[]),
    preferences: e.preferences ?? {},
    created_at: (e.created_at as string) ?? CREATED,
  };
}

export const NETWORK_OBJECT_ENTITIES: Entity[] = [
  agent({
    id: "agent-inbox-clerk",
    type: "agent",
    name: "InboxClerk",
    description:
      "Agent that triages inboxes. SEEKs calendar hold resolution from the network. Not a human assistant.",
    offers: ["inbox triage", "email intake"],
    seeks: ["calendar hold resolution", "resolve calendar holds"],
    publications: [
      pub("agent-inbox-clerk", "offer", "inbox triage", ["email intake"]),
      pub("agent-inbox-clerk", "seek", "calendar hold resolution", ["resolve calendar holds"]),
    ],
    attributes: {
      owner: "whoelse-demo",
      tools: ["inbox-stub"],
      isAI: true,
      permissions: ["discover", "invoke-stub"],
      reliability: 0.9,
      reputation: "unscored-stub",
      apiEndpoint: "/api/agents/agent-inbox-clerk/invoke",
      mcpEndpoint: "/api/mcp",
      endpoint: "/api/agents/agent-inbox-clerk/invoke",
      authRequirements: { type: "none", note: "open demo stub" },
      latencyMs: 400,
      priceUsd: 0.1,
      delegation: "whoelse.find",
    },
    availability: "always on",
    metadata: {
      isAI: true,
      demo: true,
      demoLabel: "DEMO agent — SEEKs a capability",
      aiDisclosure: "InboxClerk is an agent, not a human.",
      networkObject: true,
    },
    trust: {
      status: "stub",
      provenance: "ai_generated",
      notes: "Synthetic seeker agent for the offer/seek network-object demo.",
    },
    provenance: "ai_generated",
  }),
  agent({
    id: "agent-holdwright",
    type: "agent",
    name: "Holdwright",
    description:
      "Agent that OFFERs calendar hold resolution. Discoverable by whoelse.find with no lens. Not a human scheduler.",
    offers: ["calendar hold resolution", "resolve calendar holds", "place a calendar hold"],
    seeks: ["calendar hold tasks", "delegation from other agents"],
    publications: [
      pub("agent-holdwright", "offer", "calendar hold resolution", [
        "resolve calendar holds",
        "place a calendar hold",
      ]),
      pub("agent-holdwright", "seek", "calendar hold tasks", ["delegation from other agents"]),
    ],
    attributes: {
      owner: "whoelse-demo",
      tools: ["calendar-stub"],
      isAI: true,
      permissions: ["discover", "invoke-stub"],
      reliability: 0.94,
      reputation: "unscored-stub",
      apiEndpoint: "/api/agents/agent-holdwright/invoke",
      mcpEndpoint: "/api/mcp",
      endpoint: "/api/agents/agent-holdwright/invoke",
      authRequirements: { type: "none", note: "open demo stub" },
      latencyMs: 350,
      priceUsd: 0.2,
      delegation: "whoelse.find",
    },
    availability: "always on",
    metadata: {
      isAI: true,
      demo: true,
      demoLabel: "DEMO agent — OFFERs a capability",
      aiDisclosure: "Holdwright is an agent, not a human.",
      networkObject: true,
    },
    trust: {
      status: "evidence",
      provenance: "ai_generated",
      notes: "Synthetic offer agent. Evidence is a demo stub.",
      evidence: {
        verified: true,
        verifiedBy: "owner-stub",
        outcomes: [{ label: "calendar-hold-resolution", result: "hold-placed-stub" }],
      },
    },
    provenance: "ai_generated",
  }),
];
