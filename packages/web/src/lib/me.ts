export interface MePublication {
  id?: string;
  kind: "offer" | "seek";
  capability: string;
  phrases?: string[];
  status?: "active" | "withdrawn" | "expired";
}

export interface MeEntity {
  id: string;
  type: string;
  name: string;
  description: string;
  publications?: MePublication[];
  offers: string[];
  seeks: string[];
  metadata: Record<string, unknown>;
  visibility: "private" | "public";
  ageAffirmed: boolean;
}

export interface MePayload {
  principalId?: string;
  kind?: string;
  entity: MeEntity | null;
  visibility: "private" | "public" | null;
  ageAffirmed: boolean;
  findable: boolean;
  needsOnboarding: boolean;
  affirmation: { version: string; text: string };
  error?: string;
  status?: number;
}

export async function fetchMe(): Promise<MePayload | null> {
  const res = await fetch("/api/me");
  if (res.status === 401) return null;
  return (await res.json()) as MePayload;
}
