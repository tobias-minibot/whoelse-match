import type { Entity } from "@whoelse/core";

export type InvokeBody = {
  task?: string;
  input?: string;
  context?: string;
};

export type InvokeResult = {
  ok: true;
  stub: true;
  agent: { id: string; name: string; type: string };
  would: string;
  result: Record<string, unknown>;
};

const SCRIPTS: Record<string, (task: string) => { would: string; result: Record<string, unknown> }> = {
  "agent-pdf-summarizer": (task) => ({
    would: `I would parse the PDF and return a short digest of: ${task}`,
    result: { kind: "summary", digest: `Stub summary of “${task}”. Three claims, one caveat, no citations invented.` },
  }),
  "agent-web-browser": (task) => ({
    would: `I would fetch the URL(s) in “${task}” and return cited snippets.`,
    result: { kind: "browse", snippets: [{ url: "https://example.com", quote: "stub snippet — no live fetch" }] },
  }),
  "agent-translator-de-en": (task) => ({
    would: `I would translate German→English for: ${task}`,
    result: { kind: "translation", text: `[EN stub] ${task}` },
  }),
  "agent-verifier": (task) => ({
    would: `I would check claims in “${task}” against declared sources.`,
    result: { kind: "verify", verdict: "unverified-stub", notes: "No reputation market; this is a shape only." },
  }),
  "agent-cheap-runner": (task) => ({
    would: `I would run “${task}” on a cheap worker.`,
    result: { kind: "run", cost: "stub-cheap", status: "queued-not-executed" },
  }),
  "agent-workflow": (task) => ({
    would: `I would turn “${task}” into a multi-step handoff plan.`,
    result: { kind: "workflow", steps: ["intake", "route", "report"], executed: false },
  }),
  "agent-failover": (task) => ({
    would: `I would take over if the primary failed on: ${task}`,
    result: { kind: "failover", role: "understudy", assumed: false },
  }),
  "agent-capability-index": (task) => ({
    would: `I would resolve which network worker offers: ${task}`,
    result: { kind: "index", resolved: "see whoelse.find" },
  }),
  "agent-delegate": (task) => ({
    would: `I would recommend who to delegate “${task}” to via WhoElse.`,
    result: { kind: "delegate", hint: "call whoelse.find with this intent" },
  }),
};

export function invokeAgent(entity: Entity, body: InvokeBody): InvokeResult {
  const task = (body.task ?? body.input ?? body.context ?? "this task").trim() || "this task";
  const script = SCRIPTS[entity.id] ?? ((t: string) => ({
    would: `I would attempt “${t}” using ${entity.name}'s declared offers.`,
    result: { kind: "generic", offers: entity.offers.slice(0, 3) },
  }));
  const { would, result } = script(task);
  return {
    ok: true,
    stub: true,
    agent: { id: entity.id, name: entity.name, type: entity.type },
    would,
    result,
  };
}
