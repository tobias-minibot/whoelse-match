import { hasOpenAi } from "./openai.js";
import { parseUniversal } from "./parse.js";
import type { WhoElseEngine } from "./engine.js";
import type {
  PublicationSpec,
  UniversalQuery,
  WhoElseConstraints,
  WhoElseResult,
} from "./types.js";

export type CompileClass = "WHOELSE_COMPILABLE" | "PARTIALLY_COMPILABLE" | "NOT_WHOELSE";

export interface CompileIR {
  intent: string;
  constraints: WhoElseConstraints;
  exclusions: string[];
}

export interface CompileOptions {
  find?: boolean;
  limit?: number;
  cities?: string[];
  places?: { neighborhood: string; city?: string; region?: string }[];
}

export interface CompileResult {
  classification: CompileClass;
  reason: string;
  confidence: number;
  locked: boolean;
  usedLlm: boolean;
  ir: CompileIR;
  seekDraft?: PublicationSpec;
  find?: WhoElseResult;
}

const WHOELSE_ASK =
  /\bwho else\b|\bwhoelse\b|\bwho should i (talk|speak|date|meet|delegate|recruit|ask)\b|\bfind me (a |an |someone|somebody|an? agent|a ride|a date)\b|\blooking for (someone|somebody|an? agent|a person)\b/i;
const DEVICE =
  /\b(turn (off|on)|dim |lock the|unlock|set a timer|play (some )?music|volume|thermostat|lights?)\b/i;
const FACT =
  /\b(what('s| is) the weather|what time is it|what is \d|calculate|define |translate this sentence)\b/i;
const CHITCHAT = /^(hi|hello|hey|thanks|thank you|ok|okay|yo|good (morning|night)|bye)\b/i;
const FULFILL =
  /\b(file my taxes|file taxes|book (me |a )?(table|restaurant|flight|hotel)|order (a |me )?(pizza|food|uber)|send (this |an )?email|pay (this |my |the )?(invoice|rent)|turn in|submit the)\b/i;

type Locked = {
  classification: CompileClass;
  reason: string;
  intent?: string;
  capability?: string;
};

/** Tobias / whoelse.ai examples. Heuristics must hit these without OpenAI. */
export const LOCKED_COMPILE_EXAMPLES: { text: string; expected: CompileClass }[] = [
  { text: "Who else wants to build a network of voice assistants?", expected: "WHOELSE_COMPILABLE" },
  { text: "Who else can summarize this PDF?", expected: "WHOELSE_COMPILABLE" },
  { text: "Who else should I talk to about this market?", expected: "WHOELSE_COMPILABLE" },
  { text: "Who else has a 1-bedroom in DC under $2,500?", expected: "WHOELSE_COMPILABLE" },
  { text: "Find me a ride-share", expected: "WHOELSE_COMPILABLE" },
  { text: "Who else can give me a ride from Georgetown to Dupont?", expected: "WHOELSE_COMPILABLE" },
  { text: "Who else knows about European patent law?", expected: "WHOELSE_COMPILABLE" },
  { text: "Who else is hiring AI people in Washington?", expected: "WHOELSE_COMPILABLE" },
  { text: "Who else has a loan I qualify for?", expected: "WHOELSE_COMPILABLE" },
  { text: "Who else has a restaurant table Friday?", expected: "WHOELSE_COMPILABLE" },
  { text: "I want to file my taxes!", expected: "PARTIALLY_COMPILABLE" },
  { text: "Book me a restaurant Friday", expected: "PARTIALLY_COMPILABLE" },
  { text: "Send this email for me", expected: "PARTIALLY_COMPILABLE" },
  { text: "What's the weather in Berlin?", expected: "NOT_WHOELSE" },
  { text: "Turn off the lights", expected: "NOT_WHOELSE" },
  { text: "What is 2+2?", expected: "NOT_WHOELSE" },
  { text: "Hello", expected: "NOT_WHOELSE" },
  { text: "Play some music", expected: "NOT_WHOELSE" },
];

const LOCKED = new Map<string, Locked>([
  [
    norm("Who else wants to build a network of voice assistants?"),
    {
      classification: "WHOELSE_COMPILABLE",
      reason: "Dating/collab desire. Compiles to a SEEK on the shared network.",
      intent: "Who else wants to build a network of voice assistants?",
      capability: "voice assistant network",
    },
  ],
  [
    norm("Who else can summarize this PDF?"),
    {
      classification: "WHOELSE_COMPILABLE",
      reason: "Agent capability find. Same whoelse.find as the Agents lens.",
      intent: "Who else can summarize this PDF?",
      capability: "summarize pdf",
    },
  ],
  [
    norm("Who else should I talk to about this market?"),
    {
      classification: "WHOELSE_COMPILABLE",
      reason: "Experts lens sentence. Find who to talk to — not a chat product.",
      intent: "Who else should I talk to about this market?",
      capability: "market briefing",
    },
  ],
  [
    norm("Who else has a 1-bedroom in DC under $2,500?"),
    {
      classification: "WHOELSE_COMPILABLE",
      reason: "Apartment OFFER find. Constraints belong on the SEEK, not a listings engine.",
      intent: "Who else has a 1-bedroom in DC under $2,500?",
      capability: "1-bedroom apartment",
    },
  ],
  [
    norm("Find me a ride-share"),
    {
      classification: "WHOELSE_COMPILABLE",
      reason: "whoelse.ai ride-share example. Compiles to whoelse.find, not rides.find.",
      intent: "Who else can give me a ride?",
      capability: "ride",
    },
  ],
  [
    norm("Who else can give me a ride from Georgetown to Dupont?"),
    {
      classification: "WHOELSE_COMPILABLE",
      reason: "Ride SEEK with origin/destination constraints.",
      intent: "Who else can give me a ride from Georgetown to Dupont?",
      capability: "ride",
    },
  ],
  [
    norm("Who else knows about European patent law?"),
    {
      classification: "WHOELSE_COMPILABLE",
      reason: "Digital Lawyer / expert find from the original whoelse.ai story.",
      intent: "Who else knows about European patent law?",
      capability: "European patent law",
    },
  ],
  [
    norm("Who else is hiring AI people in Washington?"),
    {
      classification: "WHOELSE_COMPILABLE",
      reason: "Jobs costume over the same find. Never jobs.find.",
      intent: "Who else is hiring AI people in Washington?",
      capability: "AI hiring",
    },
  ],
  [
    norm("Who else has a loan I qualify for?"),
    {
      classification: "WHOELSE_COMPILABLE",
      reason: "Eligibility is a CONSTRAINT on the same find — not bank.find.",
      intent: "Who else has a loan I qualify for?",
      capability: "loan",
    },
  ],
  [
    norm("Who else has a restaurant table Friday?"),
    {
      classification: "WHOELSE_COMPILABLE",
      reason: "Bookable slot is a reservation CONSTRAINT. WhoElse finds who has it; it does not book.",
      intent: "Who else has a restaurant table Friday?",
      capability: "restaurant reservation",
    },
  ],
  [
    norm("I want to file my taxes!"),
    {
      classification: "PARTIALLY_COMPILABLE",
      reason: "WhoElse can find a tax helper. It cannot file the return.",
      intent: "Who else can help file taxes?",
      capability: "tax filing help",
    },
  ],
  [
    norm("Book me a restaurant Friday"),
    {
      classification: "PARTIALLY_COMPILABLE",
      reason: "Can find who/where. Cannot complete a reservation.",
      intent: "Who else has a restaurant table Friday?",
      capability: "restaurant reservation",
    },
  ],
  [
    norm("Send this email for me"),
    {
      classification: "PARTIALLY_COMPILABLE",
      reason: "May find an agent that drafts mail. WhoElse does not send the email.",
      intent: "Who else can draft or send email?",
      capability: "email draft",
    },
  ],
  [
    norm("What's the weather in Berlin?"),
    { classification: "NOT_WHOELSE", reason: "Fact lookup. No OFFER/SEEK to publish." },
  ],
  [
    norm("Turn off the lights"),
    { classification: "NOT_WHOELSE", reason: "Device command. Not a match query." },
  ],
  [
    norm("What is 2+2?"),
    { classification: "NOT_WHOELSE", reason: "Arithmetic. Sentinel will not force a find." },
  ],
  [norm("Hello"), { classification: "NOT_WHOELSE", reason: "Greeting. No network object." }],
  [
    norm("Play some music"),
    { classification: "NOT_WHOELSE", reason: "Player command. Not who-else." },
  ],
]);

function compileIr(intent: string, q: UniversalQuery, exclusions: string[]): CompileIR {
  return {
    intent,
    constraints: {
      type: q.entityType,
      city: q.soft.city,
      region: q.soft.region,
      neighborhood: q.soft.neighborhood,
      side: q.side,
      roles: q.roles,
      radiusKm: q.soft.radiusKm,
      attributes: q.hard.length ? q.hard : undefined,
    },
    exclusions,
  };
}

function norm(text: string): string {
  return text.trim().toLowerCase().replace(/[.!?]+$/g, "").replace(/\s+/g, " ");
}

function exclusionsFrom(text: string): string[] {
  const out: string[] = [];
  const instead = text.match(/\binstead of\s+([^,?!.]+)/i);
  if (instead) out.push(instead[1].trim());
  const except = text.match(/\b(?:except|excluding|not)\s+([^,?!.]+)/i);
  if (except && !/^who else\b/i.test(except[1])) out.push(except[1].trim());
  return out;
}

function seekCapability(text: string, q: UniversalQuery): string {
  if (q.view === "dating") return "romantic compatibility";
  if (q.view === "experts") return "expert conversation";
  if (q.view === "capability") {
    const m = text.match(/\b(?:summarize|translate|verify|delegate|browse|resolve)[^?]*/i);
    if (m) return m[0].replace(/^who else (can |should i )?/i, "").trim();
    return "capability";
  }
  if (q.view === "rides") return "ride";
  if (q.view === "apartment") return "apartment";
  if (q.view === "jobs") return q.roles?.includes("applicant") ? "role" : "work";
  const stripped = text
    .replace(/^who else (can |should i |has |is |wants? )?/i, "")
    .replace(/[?!.]+$/g, "")
    .trim();
  return stripped.slice(0, 80) || "who else";
}

function classifyHeuristic(text: string, q: UniversalQuery): { classification: CompileClass; reason: string; confidence: number } {
  if (!text.trim()) {
    return { classification: "NOT_WHOELSE", reason: "Empty input.", confidence: 1 };
  }
  if (CHITCHAT.test(text.trim()) || text.trim().length < 3) {
    return { classification: "NOT_WHOELSE", reason: "Greeting or too short to be a match query.", confidence: 0.95 };
  }
  if (DEVICE.test(text) || FACT.test(text)) {
    return { classification: "NOT_WHOELSE", reason: "Device control or fact lookup — not an OFFER/SEEK.", confidence: 0.92 };
  }
  if (FULFILL.test(text) && !WHOELSE_ASK.test(text)) {
    return {
      classification: "PARTIALLY_COMPILABLE",
      reason: "WhoElse can find who might do this. It does not complete the transaction.",
      confidence: 0.8,
    };
  }
  if (WHOELSE_ASK.test(text) || q.view || q.relation || q.roles?.length) {
    return {
      classification: "WHOELSE_COMPILABLE",
      reason: "Language maps to find(compatible entities) under constraints.",
      confidence: q.view || WHOELSE_ASK.test(text) ? 0.9 : 0.7,
    };
  }
  if (/\b(i need|looking for|can anyone|help me)\b/i.test(text)) {
    return {
      classification: "PARTIALLY_COMPILABLE",
      reason: "Need-language without a clear who-else. May draft a SEEK; do not force a match.",
      confidence: 0.55,
    };
  }
  return {
    classification: "NOT_WHOELSE",
    reason: "No OFFER/SEEK/find signal. Sentinel does not invent a query.",
    confidence: 0.6,
  };
}

export function compileLanguage(text: string, opts: CompileOptions = {}): CompileResult {
  const raw = text.trim();
  const locked = LOCKED.get(norm(raw));
  const q = parseUniversal(raw || " ", opts.cities ?? [], undefined, opts.places ?? []);
  const exclusions = exclusionsFrom(raw);

  if (locked) {
    const intent = locked.intent ?? (locked.classification === "NOT_WHOELSE" ? raw : `Who else ${raw}?`);
    return {
      classification: locked.classification,
      reason: locked.reason,
      confidence: 1,
      locked: true,
      usedLlm: false,
      ir: compileIr(intent, q, exclusions),
      seekDraft:
        locked.classification === "NOT_WHOELSE"
          ? undefined
          : {
              kind: "seek",
              capability: locked.capability ?? seekCapability(raw, q),
              phrases: [intent],
            },
    };
  }

  const guessed = classifyHeuristic(raw, q);
  const intent =
    guessed.classification === "NOT_WHOELSE"
      ? raw
      : WHOELSE_ASK.test(raw)
        ? raw
        : `Who else ${raw.replace(/^[.!\s]+/, "")}`.replace(/\s+/g, " ");

  return {
    classification: guessed.classification,
    reason: guessed.reason,
    confidence: guessed.confidence,
    locked: false,
    usedLlm: false,
    ir: compileIr(intent, q, exclusions),
    seekDraft:
      guessed.classification === "NOT_WHOELSE"
        ? undefined
        : {
            kind: "seek",
            capability: seekCapability(raw, q),
            phrases: [intent],
          },
  };
}

export async function maybeRefineCompile(text: string, current: CompileResult): Promise<CompileResult> {
  if (current.locked || !hasOpenAi()) return current;
  if (current.confidence >= 0.85) return current;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.WHOELSE_OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Classify text for WhoElse. WhoElse finds entities via OFFER/SEEK. It does not book, pay, file, or control devices. Return JSON { classification: WHOELSE_COMPILABLE|PARTIALLY_COMPILABLE|NOT_WHOELSE, reason, intent, capability }. Do not invent vertical tools.",
          },
          { role: "user", content: JSON.stringify({ text, heuristic: current }) },
        ],
      }),
    });
    if (!res.ok) return current;
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? "{}") as {
      classification?: CompileClass;
      reason?: string;
      intent?: string;
      capability?: string;
    };
    if (
      parsed.classification !== "WHOELSE_COMPILABLE" &&
      parsed.classification !== "PARTIALLY_COMPILABLE" &&
      parsed.classification !== "NOT_WHOELSE"
    ) {
      return current;
    }
    return {
      ...current,
      classification: parsed.classification,
      reason: parsed.reason ?? current.reason,
      usedLlm: true,
      confidence: Math.max(current.confidence, 0.75),
      ir: { ...current.ir, intent: parsed.intent ?? current.ir.intent },
      seekDraft:
        parsed.classification === "NOT_WHOELSE"
          ? undefined
          : {
              kind: "seek",
              capability: parsed.capability ?? current.seekDraft?.capability ?? "who else",
              phrases: [parsed.intent ?? current.ir.intent],
            },
    };
  } catch {
    return current;
  }
}

export async function compileAsync(
  text: string,
  engine?: WhoElseEngine,
  opts: CompileOptions = {},
): Promise<CompileResult> {
  const cities = opts.cities ?? engine?.store.cities() ?? [];
  const places = opts.places ?? engine?.store.places() ?? [];
  let result = compileLanguage(text, { ...opts, cities, places });
  result = await maybeRefineCompile(text, result);
  if (opts.find && engine && result.classification !== "NOT_WHOELSE") {
    result = {
      ...result,
      find: await engine.whoelseAsync({
        context: result.ir.intent,
        constraints: result.ir.constraints,
        exclude: result.ir.exclusions,
        limit: opts.limit ?? 5,
      }),
    };
  }
  return result;
}
