import type { WhoElseEngine } from "./engine.js";
import type { WhoElseNetwork } from "./network.js";
import { findPreferLive, getPlaygroundEngine, type DiscoveryPool } from "./playground.js";
import type { Candidate, WhoElseConstraints, WhoElseRequest, WhoElseResult } from "./types.js";
import type { CompoundIR, IntentEdge, IntentEdgeKind } from "./compound.js";
import { composedFrom } from "./compound.js";

export interface DispatchNode {
  id: string;
  label: string;
  query: string;
  constraints: WhoElseConstraints;
  ready: boolean;
  blockedBy: string[];
  concurrent: boolean;
}

export interface DispatchPlan {
  nodes: DispatchNode[];
  edges: IntentEdge[];
  waves: string[][];
  strategy: IntentEdgeKind | "atomic";
}

export interface NodeFind {
  node: DispatchNode;
  result: WhoElseResult;
}

export interface Reconciliation {
  strategy: DispatchPlan["strategy"];
  explanation: string;
  composedFrom: string[];
  coverage: Record<string, string[]>;
}

export interface DispatchOutcome {
  ir: CompoundIR;
  plan: DispatchPlan;
  nodes: NodeFind[];
  result: WhoElseResult;
  reconciliation: Reconciliation;
}

export interface DispatchOptions {
  limit?: number;
  requester?: string;
  exclude?: string[];
}

function nodeQuery(ir: CompoundIR, label: string): string {
  const geo = [
    ir.soft.location?.nearby ? "nearby" : "",
    ir.soft.location?.neighborhood,
    ir.soft.location?.city,
  ]
    .filter(Boolean)
    .join(" ");
  const when = ir.soft.time?.phrase ?? "";
  const romantic = ir.soft.relation === "romantic" ? "romantically" : "";
  if (label === "DATE") {
    return ["Who else might I like", romantic, geo, when].filter(Boolean).join(" ").replace(/\s+/g, " ").trim() + "?";
  }
  if (label === "TENNIS") {
    return ["Who else wants to play tennis", geo, when].filter(Boolean).join(" ").replace(/\s+/g, " ").trim() + "?";
  }
  if (label === "APARTMENT") {
    return ["Who else has an apartment", geo].filter(Boolean).join(" ").replace(/\s+/g, " ").trim() + "?";
  }
  if (label === "SCHOOL") {
    return ["Who else is a school", geo].filter(Boolean).join(" ").replace(/\s+/g, " ").trim() + "?";
  }
  if (label === "FLIGHT") {
    return ["Who else has a flight", geo].filter(Boolean).join(" ").replace(/\s+/g, " ").trim() + "?";
  }
  if (label === "HOTEL") {
    return ["Who else has a hotel", geo, when].filter(Boolean).join(" ").replace(/\s+/g, " ").trim() + "?";
  }
  if (label === "JOB") {
    return ["Who else is hiring", geo].filter(Boolean).join(" ").replace(/\s+/g, " ").trim() + "?";
  }
  if (label === "REMOTE WORK") {
    return "Who else has remote work?";
  }
  return `Who else is a ${label.toLowerCase()} ${geo} ${when}?`.replace(/\s+/g, " ").trim();
}

function nodeConstraints(ir: CompoundIR, label: string): WhoElseConstraints {
  const base: WhoElseConstraints = { ...ir.constraints };
  if (label === "DATE" || label === "TENNIS") {
    return {
      type: "human",
      city: base.city,
      region: base.region,
      neighborhood: base.neighborhood,
      radiusKm: base.radiusKm,
    };
  }
  if (label === "APARTMENT") {
    return {
      ...base,
      type: base.type === "human" ? undefined : base.type,
      side: "offer",
    };
  }
  if (label === "SCHOOL") {
    return {
      city: base.city,
      region: base.region,
      neighborhood: base.neighborhood,
    };
  }
  return base;
}

function strategyOf(ir: CompoundIR): DispatchPlan["strategy"] {
  if (ir.intents.length <= 1) return "atomic";
  const kinds = new Set(ir.relations.map((e) => e.kind));
  if (kinds.has("intersect")) return "intersect";
  if (kinds.has("sequence")) return "sequence";
  if (kinds.has("fallback")) return "fallback";
  if (kinds.has("constrains") || kinds.has("depends")) return "constrains";
  return "parallel";
}

export function buildDispatchPlan(ir: CompoundIR): DispatchPlan {
  const strategy = strategyOf(ir);
  const nodes: DispatchNode[] = ir.intents.map((intent) => {
    const incoming = ir.relations.filter((e) => e.to === intent.id && (e.kind === "depends" || e.kind === "sequence"));
    const blockedBy = incoming.map((e) => e.from);
    const concurrent = blockedBy.length === 0;
    return {
      id: intent.id,
      label: intent.label,
      query: nodeQuery(ir, intent.label),
      constraints: nodeConstraints(ir, intent.label),
      ready: concurrent,
      blockedBy,
      concurrent,
    };
  });

  const waves: string[][] = [];
  const remaining = new Set(nodes.map((n) => n.id));
  const done = new Set<string>();
  while (remaining.size) {
    const ready = nodes.filter((n) => remaining.has(n.id) && n.blockedBy.every((id) => done.has(id)));
    const batch = (ready.length ? ready : nodes.filter((n) => remaining.has(n.id))).map((n) => n.id);
    if (!batch.length) break;
    waves.push(batch);
    for (const id of batch) {
      remaining.delete(id);
      done.add(id);
    }
  }

  return { nodes, edges: ir.relations, waves, strategy };
}

function coverageMap(nodes: NodeFind[]): Record<string, string[]> {
  const coverage: Record<string, string[]> = {};
  for (const { node, result } of nodes) {
    for (const c of result.candidates) {
      (coverage[c.entity.id] ??= []).push(node.label);
    }
  }
  return coverage;
}

function mergeCandidate(a: Candidate, b: Candidate, labels: string[]): Candidate {
  const score = 1 - (1 - a.score) * (1 - b.score);
  const common = [...new Set([...a.explanation.commonalities, ...b.explanation.commonalities, ...labels])];
  return {
    entity: a.entity,
    score,
    explanation: {
      why: `${a.explanation.why} Also ${b.explanation.why}`.slice(0, 400),
      commonalities: common.slice(0, 8),
      surprisingDifference: a.explanation.surprisingDifference ?? b.explanation.surprisingDifference,
      scoreBreakdown: {
        text: (a.explanation.scoreBreakdown.text + b.explanation.scoreBreakdown.text) / 2,
        structured: (a.explanation.scoreBreakdown.structured + b.explanation.scoreBreakdown.structured) / 2,
        location: Math.max(a.explanation.scoreBreakdown.location, b.explanation.scoreBreakdown.location),
        feedback: Math.max(a.explanation.scoreBreakdown.feedback, b.explanation.scoreBreakdown.feedback),
        reputation:
          ((a.explanation.scoreBreakdown.reputation ?? 0) + (b.explanation.scoreBreakdown.reputation ?? 0)) / 2,
        total: score,
      },
    },
    matched: a.matched ?? b.matched,
  };
}

function intersectExplain(labels: string[]): string {
  return `Intersection: one result that satisfies ${labels.join(" ∩ ")}. Not concatenated lists.`;
}

function reconcileIntersect(ir: CompoundIR, plan: DispatchPlan, nodes: NodeFind[], limit: number): {
  candidates: Candidate[];
  explanation: string;
} {
  const labels = composedFrom(ir);
  const byId = new Map<string, Candidate>();
  const seen = coverageMap(nodes);
  const needed = new Set(nodes.map((n) => n.node.label));

  for (const { result } of nodes) {
    for (const c of result.candidates) {
      const prev = byId.get(c.entity.id);
      byId.set(c.entity.id, prev ? mergeCandidate(prev, c, seen[c.entity.id] ?? []) : c);
    }
  }

  const ranked = [...byId.values()].map((c) => {
    const hit = new Set(seen[c.entity.id] ?? []);
    const coverage = hit.size / Math.max(needed.size, 1);
    const bonus = coverage === 1 ? 0.18 : coverage >= 0.5 ? 0.06 : 0;
    const score = Math.min(1, c.score + bonus);
    const missing = [...needed].filter((l) => !hit.has(l));
    const why =
      coverage === 1
        ? `${c.entity.name} satisfies ${labels.join(" ∩ ")}.`
        : `${c.entity.name} covers ${[...hit].join(" + ") || "part of the graph"}${missing.length ? ` — missing ${missing.join(", ")}` : ""}.`;
    return {
      ...c,
      score,
      explanation: {
        ...c.explanation,
        why: `${why} ${c.explanation.why}`.slice(0, 420),
        commonalities: [...new Set([...(c.explanation.commonalities ?? []), ...[...hit]])].slice(0, 8),
        scoreBreakdown: { ...c.explanation.scoreBreakdown, total: score },
      },
    };
  });

  ranked.sort((a, b) => {
    const ac = (seen[a.entity.id] ?? []).length;
    const bc = (seen[b.entity.id] ?? []).length;
    if (bc !== ac) return bc - ac;
    return b.score - a.score;
  });

  const full = ranked.filter((c) => (seen[c.entity.id] ?? []).length >= needed.size);
  const chosen = (full.length ? full : ranked).slice(0, limit);
  return {
    candidates: chosen,
    explanation: full.length
      ? intersectExplain(labels)
      : `No one currently matches every intent (${labels.join(" ∩ ")}). Ranked by coverage, then score — still one list, not a concat.`,
  };
}

function samePlace(a: Candidate, b: Candidate): boolean {
  const an = String(a.entity.attributes?.neighborhood ?? "").toLowerCase();
  const bn = String(b.entity.attributes?.neighborhood ?? "").toLowerCase();
  if (an && bn && (an.includes(bn) || bn.includes(an))) return true;
  const ac = a.entity.location?.city;
  const bc = b.entity.location?.city;
  return Boolean(ac && bc && ac === bc);
}

function reconcileConstrains(ir: CompoundIR, nodes: NodeFind[], limit: number): {
  candidates: Candidate[];
  explanation: string;
} {
  const labels = composedFrom(ir);
  const constrainers = nodes.filter((n) =>
    ir.relations.some((e) => e.kind === "constrains" && e.from === n.node.id),
  );
  const constrained = nodes.filter((n) =>
    ir.relations.some((e) => e.kind === "constrains" && e.to === n.node.id),
  );
  const primary = (constrained.length ? constrained : nodes)[0];
  const filterBy = constrainers.flatMap((n) => n.result.candidates);
  const picked: Candidate[] = [];
  for (const c of primary?.result.candidates ?? []) {
    const near = filterBy.filter((s) => samePlace(c, s));
    if (!filterBy.length || near.length) {
      const school = near[0];
      picked.push({
        ...c,
        explanation: {
          ...c.explanation,
          why: school
            ? `${c.entity.name} is near ${school.entity.name} (${labels.join(" + ")}). ${c.explanation.why}`
            : c.explanation.why,
          commonalities: [...new Set([...c.explanation.commonalities, ...labels, ...(school ? [school.entity.name] : [])])].slice(
            0,
            8,
          ),
        },
      });
    }
  }
  const fallback = picked.length ? picked : (primary?.result.candidates ?? []);
  return {
    candidates: fallback.slice(0, limit),
    explanation: `Constrained plan: ${labels.join(" + ")} — primary results filtered by the constraining intent's place.`,
  };
}

function reconcileSequence(ir: CompoundIR, nodes: NodeFind[], limit: number): {
  candidates: Candidate[];
  explanation: string;
} {
  const labels = composedFrom(ir);
  const ordered = planOrder(ir, nodes);
  const first = ordered[0]?.result.candidates ?? [];
  const rest = ordered.slice(1);
  const picked = first.slice(0, limit).map((c, i) => {
    const later = rest
      .map((n) => n.result.candidates[Math.min(i, Math.max(0, n.result.candidates.length - 1))])
      .filter(Boolean);
    const nextNames = later.map((x) => x.entity.name).join(" → ");
    return {
      ...c,
      explanation: {
        ...c.explanation,
        why: nextNames
          ? `Plan: ${c.entity.name} → ${nextNames} (${labels.join(" → ")}). ${c.explanation.why}`
          : c.explanation.why,
        commonalities: [...new Set([...c.explanation.commonalities, ...labels])].slice(0, 8),
      },
    };
  });
  return {
    candidates: picked,
    explanation: `Sequence: ${labels.join(" → ")}. One plan, ordered — not two unrelated lists.`,
  };
}

function planOrder(ir: CompoundIR, nodes: NodeFind[]): NodeFind[] {
  const seq = ir.relations.filter((e) => e.kind === "sequence" || e.kind === "depends");
  if (!seq.length) return nodes;
  const from = new Set(seq.map((e) => e.from));
  const to = new Set(seq.map((e) => e.to));
  const start = nodes.find((n) => from.has(n.node.id) && !to.has(n.node.id)) ?? nodes[0];
  const ordered = [start];
  let cur = start.node.id;
  for (let i = 0; i < nodes.length; i++) {
    const edge = seq.find((e) => e.from === cur);
    if (!edge) break;
    const next = nodes.find((n) => n.node.id === edge.to);
    if (!next || ordered.includes(next)) break;
    ordered.push(next);
    cur = next.node.id;
  }
  for (const n of nodes) if (!ordered.includes(n)) ordered.push(n);
  return ordered;
}

function reconcileFallback(nodes: NodeFind[], limit: number): {
  candidates: Candidate[];
  explanation: string;
} {
  const first = nodes[0]?.result.candidates ?? [];
  if (first.length) {
    return { candidates: first.slice(0, limit), explanation: `Primary intent had matches; fallback unused.` };
  }
  const next = nodes[1]?.result.candidates ?? [];
  return { candidates: next.slice(0, limit), explanation: `Primary empty — used fallback intent.` };
}

function reconcileParallel(ir: CompoundIR, nodes: NodeFind[], limit: number): {
  candidates: Candidate[];
  explanation: string;
} {
  return reconcileIntersect(ir, buildDispatchPlan(ir), nodes, limit);
}

function finishResult(
  query: string,
  candidates: Candidate[],
  template: WhoElseResult | undefined,
  extra: Partial<WhoElseResult>,
): WhoElseResult {
  return {
    query,
    inferredMode: template?.inferredMode ?? "expand",
    inferredConstraints: template?.inferredConstraints ?? {},
    inferredVertical: template?.inferredVertical,
    inferredView: template?.inferredView,
    universal: template?.universal,
    usedOpenAiRerank: false,
    pool: template?.pool,
    candidates,
    pairs: template?.pairs ?? [],
    humans: candidates.filter((c) => c.entity.type === "human"),
    ais: candidates.filter((c) => c.entity.type === "ai"),
    byType: group(candidates),
    ...extra,
  };
}

function group(candidates: Candidate[]): Record<string, Candidate[]> {
  const byType: Record<string, Candidate[]> = {};
  for (const c of candidates) {
    (byType[c.entity.type] ??= []).push(c);
  }
  return byType;
}

export function reconcileDispatch(ir: CompoundIR, plan: DispatchPlan, nodes: NodeFind[], limit = 8): {
  result: WhoElseResult;
  reconciliation: Reconciliation;
} {
  const coverage = coverageMap(nodes);
  let picked: { candidates: Candidate[]; explanation: string };
  if (plan.strategy === "sequence") picked = reconcileSequence(ir, nodes, limit);
  else if (plan.strategy === "constrains") picked = reconcileConstrains(ir, nodes, limit);
  else if (plan.strategy === "fallback") picked = reconcileFallback(nodes, limit);
  else if (plan.strategy === "atomic") {
    picked = { candidates: (nodes[0]?.result.candidates ?? []).slice(0, limit), explanation: "Single intent — degenerate compound." };
  } else picked = reconcileIntersect(ir, plan, nodes, limit);

  const template = nodes[0]?.result;
  const result = finishResult(ir.intent, picked.candidates, template, {
    composedFrom: composedFrom(ir),
    composition: {
      strategy: plan.strategy,
      explanation: picked.explanation,
      plan,
    },
  });
  return {
    result,
    reconciliation: {
      strategy: plan.strategy,
      explanation: picked.explanation,
      composedFrom: composedFrom(ir),
      coverage,
    },
  };
}

async function runNode(
  find: (request: WhoElseRequest) => Promise<WhoElseResult>,
  ir: CompoundIR,
  node: DispatchNode,
  opts: DispatchOptions,
): Promise<NodeFind> {
  const result = await find({
    context: node.query,
    constraints: node.constraints,
    exclude: opts.exclude ?? ir.exclusions,
    requester: opts.requester,
    limit: Math.max(opts.limit ?? 8, 8),
  });
  return { node, result };
}

export async function dispatchOnEngine(
  engine: WhoElseEngine,
  ir: CompoundIR,
  opts: DispatchOptions = {},
): Promise<DispatchOutcome> {
  return dispatchWith(engine.whoelseAsync.bind(engine), ir, opts);
}

export async function dispatchWith(
  find: (request: WhoElseRequest) => Promise<WhoElseResult>,
  ir: CompoundIR,
  opts: DispatchOptions = {},
): Promise<DispatchOutcome> {
  const plan = buildDispatchPlan(ir);
  const limit = opts.limit ?? 8;
  const found: NodeFind[] = [];
  const byId = new Map(plan.nodes.map((n) => [n.id, n]));
  for (const wave of plan.waves) {
    const batch = await Promise.all(wave.map((id) => runNode(find, ir, byId.get(id)!, opts)));
    found.push(...batch);
  }
  const { result, reconciliation } = reconcileDispatch(ir, plan, found, limit);
  return { ir, plan, nodes: found, result, reconciliation };
}

/**
 * Pick one pool (live vs playground) from the original sentence, then dispatch
 * every node on that engine. Never concatenates live + playground.
 */
export async function dispatchCompound(
  network: WhoElseNetwork,
  ir: CompoundIR,
  opts: DispatchOptions = {},
): Promise<DispatchOutcome & { pool: DiscoveryPool }> {
  const probe = await findPreferLive(network, {
    context: ir.intent,
    constraints: ir.constraints,
    exclude: opts.exclude ?? ir.exclusions,
    requester: opts.requester,
    limit: 1,
  });
  const pool = probe.pool;
  const engine = pool === "playground" && network.seedMode !== "demo" ? getPlaygroundEngine() : network.engine;
  const outcome = await dispatchOnEngine(engine, ir, opts);
  outcome.result = { ...outcome.result, pool };
  return { ...outcome, pool };
}
