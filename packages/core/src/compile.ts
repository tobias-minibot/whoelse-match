import { parseCompound, type CompoundIR } from "./compound.js";
import { dispatchOnEngine, type DispatchOutcome, type DispatchPlan } from "./dispatch.js";
import { hasOpenAi } from "./openai.js";
import { parseUniversal } from "./parse.js";
import type { WhoElseEngine } from "./engine.js";
import type { PublicationSpec, UniversalQuery, WhoElseResult } from "./types.js";
import { searchVocab, type IntentSearchHit } from "./vocab.js";

export type CompileClass = "WHOELSE_COMPILABLE" | "PARTIALLY_COMPILABLE" | "NOT_WHOELSE";

/** Sentinel IR. Compound is the native shape; one intent is a degenerate compound. */
export type CompileIR = CompoundIR;

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
  plan?: DispatchPlan;
  dispatch?: DispatchOutcome;
  /** Ranked vocab discovery hits — not the compiled graph. Use ir.intents for dispatch. */
  vocabHits?: IntentSearchHit[];
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
  {
    text: "Find me someone nearby I might like who wants to play tennis tonight.",
    expected: "WHOELSE_COMPILABLE",
  },
  {
    text: "I want to play tennis with someone I might like romantically tonight, somewhere nearby.",
    expected: "WHOELSE_COMPILABLE",
  },
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
  [
    norm("Find me someone nearby I might like who wants to play tennis tonight."),
    {
      classification: "WHOELSE_COMPILABLE",
      reason: "Compound: DATE ∩ TENNIS, nearby, tonight. One graph, not a dating app plus a tennis app.",
      intent: "Find me someone nearby I might like who wants to play tennis tonight.",
      capability: "romantic tennis companion",
    },
  ],
  [
    norm("I want to play tennis with someone I might like romantically tonight, somewhere nearby."),
    {
      classification: "WHOELSE_COMPILABLE",
      reason: "Compound: DATE ∩ TENNIS + nearby + tonight + romantic. Composition is the product.",
      intent: "I want to play tennis with someone I might like romantically tonight, somewhere nearby.",
      capability: "romantic tennis companion",
    },
  ],
]);

function compileIr(
  text: string,
  intent: string,
  exclusions: string[],
  cities: string[],
  places: CompileOptions["places"],
): CompileIR {
  return parseCompound(text, { cities, places, intent, exclusions });
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
  if (/\b(i need|looking for|can anyone|help me|i want to)\b/i.test(text)) {
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
  const cities = opts.cities ?? [];
  const places = opts.places ?? [];

  if (locked) {
    const intent = locked.intent ?? (locked.classification === "NOT_WHOELSE" ? raw : `Who else ${raw}?`);
    const ir = compileIr(raw, intent, exclusions, cities, places);
    return {
      classification: locked.classification,
      reason: locked.reason,
      confidence: 1,
      locked: true,
      usedLlm: false,
      ir,
      vocabHits: searchVocab(raw, { limit: 8, minLength: 2 }),
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
  const ir = compileIr(raw, intent, exclusions, cities, places);
  const vocabHits = searchVocab(raw, { limit: 8, minLength: 2 });
  const compound = ir.intents.length > 1;
  const labeled = ir.intents.length >= 1;
  let classification = guessed.classification;
  if (compound && guessed.classification === "NOT_WHOELSE") classification = "WHOELSE_COMPILABLE";
  else if (compound && guessed.classification === "PARTIALLY_COMPILABLE" && !FULFILL.test(raw)) {
    classification = "WHOELSE_COMPILABLE";
  } else if (
    labeled &&
    guessed.classification === "NOT_WHOELSE" &&
    !DEVICE.test(raw) &&
    !FACT.test(raw) &&
    !CHITCHAT.test(raw.trim())
  ) {
    classification = "WHOELSE_COMPILABLE";
  }
  const reason = compound
    ? `Compound ${ir.intents.map((i) => i.label).join(" + ")}. One graph on whoelse.find — not a vertical app per label.`
    : labeled && classification === "WHOELSE_COMPILABLE" && guessed.classification === "NOT_WHOELSE"
      ? `Language maps to vocab ${ir.intents.map((i) => i.label).join(" + ")} on whoelse.find.`
      : guessed.reason;
  const confidence = compound ? Math.max(guessed.confidence, 0.86) : labeled ? Math.max(guessed.confidence, 0.72) : guessed.confidence;

  return {
    classification,
    reason,
    confidence,
    locked: false,
    usedLlm: false,
    ir,
    vocabHits,
    seekDraft:
      classification === "NOT_WHOELSE"
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
    if (result.ir.intents.length > 1) {
      const dispatched = await dispatchOnEngine(engine, result.ir, {
        limit: opts.limit ?? 5,
        exclude: result.ir.exclusions,
      });
      result = {
        ...result,
        find: dispatched.result,
        plan: dispatched.plan,
        dispatch: dispatched,
      };
    } else {
      result = {
        ...result,
        find: await engine.whoelseAsync({
          context: result.ir.intent,
          constraints: result.ir.constraints,
          exclude: result.ir.exclusions,
          limit: opts.limit ?? 5,
        }),
        plan: {
          nodes: result.ir.intents.map((intent) => ({
            id: intent.id,
            label: intent.label,
            query: result.ir.intent,
            constraints: result.ir.constraints,
            ready: true,
            blockedBy: [],
            concurrent: true,
          })),
          edges: result.ir.relations,
          waves: [result.ir.intents.map((i) => i.id)],
          strategy: "atomic",
        },
      };
    }
  }
  return result;
}
