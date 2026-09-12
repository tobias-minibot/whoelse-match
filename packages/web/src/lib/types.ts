export type EntityType = string;

export interface Entity {
  id: string;
  type: EntityType;
  name: string;
  description: string;
  attributes: Record<string, unknown>;
  offers?: string[];
  seeks?: string[];
  capabilities: string[];
  preferences: Record<string, unknown>;
  availability?: string;
  location?: { city?: string; region?: string; country?: string };
  metadata: Record<string, unknown>;
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
}

export interface WhoElsePayload {
  query: string;
  inferredMode: string;
  inferredConstraints: Record<string, unknown>;
  usedOpenAiRerank: boolean;
  candidates: Candidate[];
  humans: Candidate[];
  ais: Candidate[];
  byType?: Record<string, Candidate[]>;
}
