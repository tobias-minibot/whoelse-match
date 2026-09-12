import type { Candidate } from "./types.js";

const RERANK_MODEL = process.env.WHOELSE_OPENAI_MODEL ?? "gpt-4o-mini";

export function hasOpenAi(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function maybeRerankAndExplain(
  query: string,
  candidates: Candidate[],
): Promise<{ used: boolean; candidates: Candidate[] }> {
  if (!hasOpenAi() || candidates.length === 0) {
    return { used: false, candidates };
  }

  const payload = candidates.slice(0, 12).map((c, i) => ({
    i,
    id: c.entity.id,
    type: c.entity.type,
    name: c.entity.name,
    description: c.entity.description,
    capabilities: c.entity.capabilities,
    score: Number(c.score.toFixed(3)),
  }));

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: RERANK_MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You rerank WhoElse discovery candidates. Humans and AIs are both valid. Never pretend an AI is human. Return JSON { items: [{ id, why, commonalities, surprisingDifference }] } in best-first order. Keep every id.",
          },
          {
            role: "user",
            content: JSON.stringify({ query, candidates: payload }),
          },
        ],
      }),
    });
    if (!res.ok) return { used: false, candidates };
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? "{}") as {
      items?: {
        id: string;
        why?: string;
        commonalities?: string[];
        surprisingDifference?: string;
      }[];
    };
    if (!parsed.items?.length) return { used: false, candidates };

    const byId = new Map(candidates.map((c) => [c.entity.id, c]));
    const reranked: Candidate[] = [];
    parsed.items.forEach((item, rank) => {
      const current = byId.get(item.id);
      if (!current) return;
      const bonus = Math.max(0, (parsed.items!.length - rank) / parsed.items!.length) * 0.12;
      reranked.push({
        ...current,
        score: current.score + bonus,
        explanation: {
          ...current.explanation,
          why: item.why ?? current.explanation.why,
          commonalities: item.commonalities?.length
            ? item.commonalities
            : current.explanation.commonalities,
          surprisingDifference:
            item.surprisingDifference ?? current.explanation.surprisingDifference,
          scoreBreakdown: {
            ...current.explanation.scoreBreakdown,
            rerank: bonus,
            total: current.score + bonus,
          },
        },
      });
      byId.delete(item.id);
    });
    for (const leftover of byId.values()) reranked.push(leftover);
    reranked.sort((a, b) => b.score - a.score);
    return { used: true, candidates: reranked };
  } catch {
    return { used: false, candidates };
  }
}

export async function maybeChat(
  persona: { name: string; description: string; capabilities: string[] },
  messages: { role: "user" | "assistant"; content: string }[],
): Promise<string | null> {
  if (!hasOpenAi()) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: RERANK_MODEL,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: `You are ${persona.name}, a clearly labeled AI. Never claim to be human. Persona: ${persona.description}. Skills: ${persona.capabilities.join(", ")}. Keep replies short.`,
          },
          ...messages,
        ],
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return json.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}
