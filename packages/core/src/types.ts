/** Generic first-class entity. Dating fields live in attributes / preferences. */
export type EntityType = "human" | "ai";
export type Provenance = "synthetic" | "ai_generated" | "user";
export type WhoElseMode = "substitute" | "expand" | "peers";

export interface GeoLocation {
  city?: string;
  region?: string;
  country?: string;
}

export interface Entity {
  id: string;
  type: EntityType;
  name: string;
  description: string;
  attributes: Record<string, unknown>;
  capabilities: string[];
  preferences: Record<string, unknown>;
  availability?: string;
  location?: GeoLocation;
  embedding?: number[];
  metadata: Record<string, unknown>;
  provenance: Provenance;
  created_at: string;
}

export interface WhoElseConstraints {
  type?: EntityType;
  city?: string;
  region?: string;
  country?: string;
  interests?: string[];
  capabilities?: string[];
  limit?: number;
}

export interface WhoElseRequest {
  /** Natural-language desire, or an exemplar entity id, or both. */
  context: string;
  /** Optional extra “more of this” predicate (interests, vibe, role). */
  predicate?: string;
  constraints?: WhoElseConstraints;
  exclude?: string[];
  mode?: WhoElseMode;
  /** When set, treat this entity as the exemplar (recursive WhoElse). */
  entityId?: string;
  limit?: number;
}

export interface ScoreBreakdown {
  text: number;
  structured: number;
  location: number;
  feedback: number;
  rerank?: number;
  total: number;
}

export interface MatchExplanation {
  why: string;
  commonalities: string[];
  surprisingDifference?: string;
  scoreBreakdown: ScoreBreakdown;
}

export interface Candidate {
  entity: Entity;
  score: number;
  explanation: MatchExplanation;
}

export interface WhoElseResult {
  query: string;
  inferredMode: WhoElseMode;
  inferredConstraints: WhoElseConstraints;
  usedOpenAiRerank: boolean;
  candidates: Candidate[];
  humans: Candidate[];
  ais: Candidate[];
}

export interface FeedbackEvent {
  entityId: string;
  signal: "more" | "less";
  query?: string;
  at: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface InterestRecord {
  entityId: string;
  at: string;
  note?: string;
}
