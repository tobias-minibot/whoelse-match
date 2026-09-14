export type EntityType = string;

export interface Entity {
  id: string;
  type: EntityType;
  name: string;
  description: string;
  attributes: Record<string, unknown>;
  offers?: string[];
  seeks?: string[];
  publications?: { id: string; kind: string; capability: string }[];
  capabilities: string[];
  preferences: Record<string, unknown>;
  availability?: string;
  location?: { city?: string; region?: string; country?: string };
  metadata: Record<string, unknown>;
  trust?: {
    status?: string;
    notes?: string;
    evidence?: {
      verified?: boolean;
      verifiedBy?: string;
      portfolio?: string[];
      outcomes?: { label: string; result?: string }[];
      licenses?: string[];
      references?: string[];
      receipts?: string[];
    };
  };
  provenance: string;
  created_at: string;
}

export interface Candidate {
  entity: Entity;
  score: number;
  explanation: {
    why: string;
    commonalities: string[];
    surprisingDifference?: string;
  };
  matched?: {
    offer?: { id: string; kind: string; capability: string };
    seek?: { id: string; kind: string; capability: string };
  };
}

export interface WhoElsePayload {
  query: string;
  inferredMode: string;
  inferredConstraints: Record<string, unknown>;
  inferredVertical?: string;
  inferredView?: string;
  universal?: {
    text: string;
    side?: string;
    entityType?: string;
    relation?: string;
    roles?: string[];
    hard: { key: string; op: string; value?: unknown }[];
    soft: { city?: string; neighborhood?: string; cheaper?: boolean; labels?: string[] };
    evidenceNeeds: string[];
    state?: { op: string; value: string };
    ranking: string;
    view?: string;
  };
  usedOpenAiRerank: boolean;
  candidates: Candidate[];
  pairs?: {
    offer: { id: string; entityId: string; kind: string; capability: string };
    seek: { id: string; entityId: string; kind: string; capability: string };
    score: number;
    offerEntityId: string;
    seekEntityId: string;
  }[];
  humans: Candidate[];
  ais: Candidate[];
  byType?: Record<string, Candidate[]>;
  pool?: "live" | "playground";
  composedFrom?: string[];
  composition?: {
    strategy?: string;
    explanation?: string;
    plan?: { strategy?: string; waves?: string[][]; nodes?: { label: string; concurrent?: boolean }[] };
  };
}
