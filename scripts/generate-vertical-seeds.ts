#!/usr/bin/env npx tsx
/**
 * Idempotent seed merge for jobs / rides / services / factory verticals + agent deepening.
 * Shared schema only — no vertical-specific types.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildFactoryEntities } from "./factory-entities.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEED = join(ROOT, "data", "seed.json");
const CREATED = "2026-09-12T12:00:00.000Z";

type Entity = Record<string, unknown> & { id: string; type: string };

const DC = { city: "Washington", region: "DC", country: "US" };
const NYC = { city: "New York", region: "NY", country: "US" };
const BERLIN = { city: "Berlin", region: "BE", country: "DE" };

function trust(
  status: "unscored" | "stub" | "evidence",
  notes: string,
  evidence?: Record<string, unknown>,
) {
  return {
    status,
    provenance: "synthetic" as const,
    notes,
    ...(evidence ? { evidence } : {}),
  };
}

function meta(vertical: string, demoLabel: string, extra: Record<string, unknown> = {}) {
  return { demo: true, demoLabel, vertical, scale: "2026-verticals", ...extra };
}

function base(
  e: Omit<Entity, "created_at" | "capabilities" | "preferences"> & {
    capabilities?: string[];
    preferences?: Record<string, unknown>;
    created_at?: string;
  },
): Entity {
  return {
    ...e,
    capabilities: e.capabilities ?? e.offers,
    preferences: e.preferences ?? {},
    created_at: e.created_at ?? CREATED,
  };
}

const companies = [
  base({
    id: "company-northwind-labs",
    type: "company",
    name: "Northwind Labs",
    description:
      "DEMO synthetic employer in Washington. Hiring AI engineers and people who have shipped model evals. Not a real company.",
    offers: ["AI engineer role", "hiring AI people", "job in Washington", "full-time role"],
    seeks: ["AI engineer", "someone with model eval background", "people who can start soon"],
    location: DC,
    availability: "hiring now",
    attributes: {
      synthetic: true,
      role: "employer",
      roleTitle: "AI engineer",
      rate: 140000,
      salary: 140000,
      currency: "USD",
      start: "immediate",
      owner: "company-northwind-labs",
    },
    metadata: meta("jobs", "DEMO synthetic employer"),
    trust: trust("stub", "synthetic employer — not a real hiring org"),
    provenance: "synthetic",
  }),
  base({
    id: "company-potomac-gig",
    type: "company",
    name: "Potomac Gig Desk",
    description:
      "DEMO synthetic shop for 3-week LLM projects and freelancer contracts in DC. Not a real desk.",
    offers: ["3-week project", "freelancer contract", "LLM project", "short gig"],
    seeks: ["freelancer", "contractor for a three-week project", "someone who can ship fast"],
    location: DC,
    availability: "contracts open",
    attributes: {
      synthetic: true,
      role: "employer",
      roleTitle: "3-week LLM contractor",
      rate: 4800,
      durationWeeks: 3,
      currency: "USD",
    },
    metadata: meta("jobs", "DEMO synthetic employer"),
    trust: trust("stub", "synthetic"),
    provenance: "synthetic",
  }),
  base({
    id: "company-twoweek-shop",
    type: "company",
    name: "Two-Week Shop",
    description: "DEMO synthetic studio that only runs two-week coding projects. Not a real studio.",
    offers: ["two-week coding project", "2-week project", "short coding gig"],
    seeks: ["coder for a two-week project", "available immediately"],
    location: DC,
    availability: "this sprint",
    attributes: {
      synthetic: true,
      role: "employer",
      roleTitle: "two-week coding project",
      rate: 4200,
      durationWeeks: 2,
      currency: "USD",
      start: "immediate",
    },
    metadata: meta("jobs", "DEMO synthetic employer"),
    trust: trust("stub", "synthetic"),
    provenance: "synthetic",
  }),
  base({
    id: "company-under5k",
    type: "company",
    name: "Under-5k Studio",
    description: "DEMO synthetic studio hiring work for under $5,000. Not a real studio.",
    offers: ["project under $5000", "small paid gig", "landing-page contract"],
    seeks: ["someone who can do this work for under $5,000"],
    location: DC,
    attributes: { synthetic: true, role: "employer", roleTitle: "small gig", rate: 4500, currency: "USD" },
    metadata: meta("jobs", "DEMO synthetic employer"),
    trust: trust("stub", "synthetic"),
    provenance: "synthetic",
  }),
  base({
    id: "company-immediate-start",
    type: "company",
    name: "Immediate Start Inc",
    description: "DEMO synthetic employer who needs someone who can start immediately. Not real.",
    offers: ["immediate-start role", "backend contract", "can start now"],
    seeks: ["someone who can start immediately"],
    location: DC,
    attributes: {
      synthetic: true,
      role: "employer",
      roleTitle: "backend contractor",
      rate: 8000,
      start: "immediate",
      currency: "USD",
    },
    metadata: meta("jobs", "DEMO synthetic employer"),
    trust: trust("stub", "synthetic"),
    provenance: "synthetic",
  }),
  base({
    id: "company-cascade",
    type: "company",
    name: "Cascade Systems",
    description: "DEMO synthetic DC company hiring fullstack engineers. Not a real company.",
    offers: ["fullstack role", "hiring engineers", "job opening"],
    seeks: ["fullstack engineer"],
    location: DC,
    attributes: { synthetic: true, role: "employer", roleTitle: "fullstack engineer", salary: 125000, currency: "USD" },
    metadata: meta("jobs", "DEMO synthetic employer"),
    trust: trust("stub", "synthetic"),
    provenance: "synthetic",
  }),
  base({
    id: "company-harbor",
    type: "company",
    name: "Harbor Collective",
    description: "DEMO synthetic NYC studio hiring product designers. Not real.",
    offers: ["product designer role", "hiring designers"],
    seeks: ["product designer"],
    location: NYC,
    attributes: { synthetic: true, role: "employer", roleTitle: "product designer", salary: 110000, currency: "USD" },
    metadata: meta("jobs", "DEMO synthetic employer"),
    trust: trust("stub", "synthetic"),
    provenance: "synthetic",
  }),
  base({
    id: "company-spree",
    type: "company",
    name: "Spree Studio",
    description: "DEMO synthetic Berlin studio hiring ML engineers. Not real.",
    offers: ["ML engineer role", "hiring in Berlin"],
    seeks: ["ML engineer"],
    location: BERLIN,
    attributes: { synthetic: true, role: "employer", roleTitle: "ML engineer", salary: 85000, currency: "EUR" },
    metadata: meta("jobs", "DEMO synthetic employer"),
    trust: trust("stub", "synthetic"),
    provenance: "synthetic",
  }),
  base({
    id: "company-anacostia",
    type: "company",
    name: "Anacostia Works",
    description: "DEMO synthetic DC desk for weekend and local gigs. Not real.",
    offers: ["weekend gig", "local task", "short paid work"],
    seeks: ["available weekend worker"],
    location: DC,
    attributes: { synthetic: true, role: "employer", roleTitle: "weekend gig", rate: 600, currency: "USD" },
    metadata: meta("jobs", "DEMO synthetic employer"),
    trust: trust("stub", "synthetic"),
    provenance: "synthetic",
  }),
  base({
    id: "company-quiet-ops",
    type: "company",
    name: "Quiet Capital Ops",
    description: "DEMO synthetic ops employer in DC. Not a real fund.",
    offers: ["ops role", "hiring operations"],
    seeks: ["ops generalist"],
    location: DC,
    attributes: { synthetic: true, role: "employer", roleTitle: "ops generalist", salary: 95000, currency: "USD" },
    metadata: meta("jobs", "DEMO synthetic employer"),
    trust: trust("stub", "synthetic"),
    provenance: "synthetic",
  }),
  base({
    id: "company-civic-stack",
    type: "company",
    name: "Civic Stack",
    description: "DEMO synthetic civic-tech employer in Washington. Not a real org.",
    offers: ["civic tech role", "hiring in Washington"],
    seeks: ["civic technologist"],
    location: DC,
    attributes: { synthetic: true, role: "employer", roleTitle: "civic technologist", salary: 105000, currency: "USD" },
    metadata: meta("jobs", "DEMO synthetic employer"),
    trust: trust("stub", "synthetic"),
    provenance: "synthetic",
  }),
  base({
    id: "company-hybrid-crew",
    type: "company",
    name: "Hybrid Crew Co",
    description:
      "DEMO synthetic company that hires humans and AIs onto the same crew. Not a real company.",
    offers: ["hybrid human-AI role", "hiring humans and AIs", "who else could do this job human or AI"],
    seeks: ["human or AI worker", "agent that can ship", "freelancer"],
    location: DC,
    attributes: { synthetic: true, role: "employer", roleTitle: "hybrid crew", rate: 5000, currency: "USD" },
    metadata: meta("jobs", "DEMO synthetic employer"),
    trust: trust("stub", "synthetic"),
    provenance: "synthetic",
  }),
  base({
    id: "company-fleet-dev",
    type: "company",
    name: "Fleet Dev Co",
    description:
      "DEMO synthetic vendor company that can do this work for under $5,000 — a company as a worker, not a job opening. Not a real company.",
    offers: [
      "can do this work",
      "can do this work for under $5,000",
      "two-week coding project",
      "contract team",
      "website redesign",
      "redesign my website",
    ],
    seeks: ["scoped outcomes", "short contracts"],
    location: DC,
    availability: "can start immediately",
    attributes: {
      synthetic: true,
      role: "worker",
      roleTitle: "contracting team",
      rate: 1800,
      durationWeeks: 2,
      start: "immediate",
      currency: "USD",
    },
    metadata: meta("jobs", "DEMO synthetic vendor"),
    trust: trust("stub", "company-as-worker — same role as a freelancer"),
    provenance: "synthetic",
  }),
];

const openings = [
  open("opening-northwind-ai", "Northwind AI engineer opening", "company-northwind-labs", DC, {
    roleTitle: "AI engineer",
    rate: 140000,
    salary: 140000,
    start: "immediate",
    offers: ["AI engineer role", "hiring AI people in Washington", "job opening"],
    seeks: ["AI engineer", "someone with this background"],
    extra:
      "DEMO synthetic opening attached to Northwind Labs — a job opening is an offer, not a new entity type. Not a real job.",
  }),
  open("opening-potomac-3wk", "Potomac 3-week LLM project", "company-potomac-gig", DC, {
    roleTitle: "3-week LLM contractor",
    rate: 4800,
    durationWeeks: 3,
    offers: ["3-week project", "three-week coding project", "freelancer contract"],
    seeks: ["freelancer who can ship a three-week project"],
    extra: "DEMO synthetic opening. Not a real contract.",
  }),
  open("opening-twoweek-code", "Two-week coding project", "company-twoweek-shop", DC, {
    roleTitle: "two-week coding project",
    rate: 4200,
    durationWeeks: 2,
    start: "immediate",
    offers: ["two-week coding project", "2-week project", "available immediately"],
    seeks: ["coder available for a two-week coding project"],
    extra: "DEMO synthetic opening. Not a real sprint.",
  }),
  open("opening-under5k-web", "Under-$5k web gig", "company-under5k", DC, {
    roleTitle: "landing page under $5000",
    rate: 4500,
    offers: ["work for under $5,000", "project under $5000", "small paid gig"],
    seeks: ["someone who can do this work for under $5,000"],
    extra: "DEMO synthetic opening. Not a real gig.",
  }),
  open("opening-immediate-backend", "Immediate-start backend", "company-immediate-start", DC, {
    roleTitle: "backend contractor",
    rate: 8000,
    start: "immediate",
    offers: ["can start immediately", "immediate start", "backend contract"],
    seeks: ["someone who can start immediately"],
    extra: "DEMO synthetic opening. Not a real contract.",
  }),
  open("opening-cascade-full", "Cascade fullstack opening", "company-cascade", DC, {
    roleTitle: "fullstack engineer",
    salary: 125000,
    rate: 125000,
    offers: ["fullstack role", "hiring", "job opening"],
    seeks: ["fullstack engineer"],
    extra: "DEMO synthetic opening. Not a real job.",
  }),
  open("opening-harbor-design", "Harbor designer opening", "company-harbor", NYC, {
    roleTitle: "product designer",
    salary: 110000,
    rate: 110000,
    offers: ["designer role", "hiring designers"],
    seeks: ["product designer"],
    extra: "DEMO synthetic opening. Not a real job.",
  }),
  open("opening-spree-ml", "Spree ML opening", "company-spree", BERLIN, {
    roleTitle: "ML engineer",
    salary: 85000,
    rate: 85000,
    currency: "EUR",
    offers: ["ML role in Berlin", "hiring"],
    seeks: ["ML engineer"],
    extra: "DEMO synthetic opening. Not a real job.",
  }),
  open("opening-civic", "Civic Stack opening", "company-civic-stack", DC, {
    roleTitle: "civic technologist",
    salary: 105000,
    rate: 105000,
    offers: ["civic tech role", "hiring in Washington"],
    seeks: ["civic technologist"],
    extra: "DEMO synthetic opening. Not a real job.",
  }),
  open("opening-recruit-me", "Who-else-should-I-recruit opening", "company-hybrid-crew", DC, {
    roleTitle: "recruiting target: AI generalist",
    rate: 6000,
    offers: ["who else should I recruit", "hiring", "less obvious hire"],
    seeks: ["better fit but less obvious", "someone with this background"],
    extra: "DEMO synthetic opening used for recruit-style reverse. Not a real req.",
  }),
  open("opening-anacostia-weekend", "Anacostia weekend gig", "company-anacostia", DC, {
    roleTitle: "weekend gig",
    rate: 600,
    offers: ["weekend gig", "local task"],
    seeks: ["available weekend worker"],
    extra: "DEMO synthetic opening. Not a real gig.",
  }),
  open("opening-quiet-ops", "Quiet ops opening", "company-quiet-ops", DC, {
    roleTitle: "ops generalist",
    salary: 95000,
    rate: 95000,
    offers: ["ops role", "hiring operations"],
    seeks: ["ops generalist"],
    extra: "DEMO synthetic opening. Not a real job.",
  }),
];

function open(
  id: string,
  name: string,
  owner: string,
  location: typeof DC,
  opts: {
    roleTitle: string;
    offers: string[];
    seeks: string[];
    extra: string;
    rate?: number;
    salary?: number;
    durationWeeks?: number;
    start?: string;
    currency?: string;
  },
): Entity {
  return base({
    id,
    type: "resource",
    name,
    description: opts.extra,
    offers: opts.offers,
    seeks: opts.seeks,
    location,
    availability: opts.start === "immediate" ? "immediate" : "open",
    attributes: {
      synthetic: true,
      role: "opening",
      owner,
      roleTitle: opts.roleTitle,
      rate: opts.rate,
      salary: opts.salary,
      durationWeeks: opts.durationWeeks,
      start: opts.start,
      currency: opts.currency ?? "USD",
    },
    metadata: meta("jobs", "DEMO synthetic job opening"),
    trust: trust("stub", "synthetic opening — offer attached to an employer, not a new type"),
    provenance: "synthetic",
  });
}

const workers: Entity[] = [
  worker("worker-aisha-kane", "Aisha Kane", DC, {
    occupation: "AI engineer freelancer",
    offers: [
      "AI engineering",
      "can do this work",
      "model evals",
      "hiring-grade AI work",
      "can start immediately",
    ],
    seeks: ["AI engineer role", "serious contract", "who else needs someone with my background"],
    rate: 4200,
    durationWeeks: 3,
    start: "immediate",
    desc: "DEMO synthetic freelancer in Washington. Ships AI evals. Has done this exact kind of work before. Not a real person.",
    evidence: {
      verified: true,
      verifiedBy: "demo-stub",
      portfolio: ["https://example.com/demo/aisha"],
      outcomes: [{ label: "3-week eval harness", result: "shipped (synthetic)" }],
    },
  }),
  worker("worker-benito-cruz", "Benito Cruz", DC, {
    occupation: "fullstack freelancer",
    offers: ["fullstack", "can do this work", "can start immediately", "two-week coding project"],
    seeks: ["two-week coding project", "immediate start"],
    rate: 3900,
    durationWeeks: 2,
    start: "immediate",
    desc: "DEMO synthetic fullstack who can start immediately. Not a real person.",
  }),
  worker("worker-cleo-hart", "Cleo Hart", DC, {
    occupation: "product designer",
    offers: ["product design", "can do this work for under $5,000", "landing pages", "website redesign", "redesign my website"],
    seeks: ["design gig under $5000"],
    rate: 3500,
    desc: "DEMO synthetic designer who can do this work for under $5,000. Not a real person.",
  }),
  worker("worker-drew-ibarra", "Drew Ibarra", DC, {
    occupation: "LLM eval contractor",
    offers: ["done this exact kind of work", "LLM evals", "can do this work", "AI engineer"],
    seeks: ["another eval contract"],
    rate: 4700,
    durationWeeks: 3,
    desc: "DEMO synthetic contractor who has done this exact kind of work before — eval harnesses. Not a real person.",
    evidence: {
      verified: true,
      verifiedBy: "demo-stub",
      outcomes: [
        { label: "exact kind of work: model evals", result: "repeatable stub outcome" },
        { label: "three-week project", result: "delivered (synthetic)" },
      ],
      portfolio: ["https://example.com/demo/drew"],
    },
  }),
  worker("worker-ellis-voss", "Ellis Voss", DC, {
    occupation: "career-changer coder",
    offers: ["better fit but less obvious", "teaching plus code", "can do this work"],
    seeks: ["who else should I recruit", "less obvious hire"],
    rate: 2800,
    desc: "DEMO synthetic career changer — former teacher, now codes. The less-obvious better fit. Not a real person.",
  }),
  worker("worker-farah-quinn", "Farah Quinn", DC, {
    occupation: "hybrid human+AI operator",
    offers: ["human or AI hybrid", "delegates to agents", "can do this work", "two-week coding project"],
    seeks: ["hybrid crew", "who else could do this job human or AI"],
    rate: 4100,
    durationWeeks: 2,
    desc: "DEMO synthetic human who works with agents. Not a real person.",
  }),
  worker("worker-gabe-singh", "Gabe Singh", DC, {
    occupation: "two-week specialist",
    offers: ["two-week coding project", "2-week project", "can do this work"],
    seeks: ["another two-week coding project"],
    rate: 4000,
    durationWeeks: 2,
    start: "immediate",
    desc: "DEMO synthetic specialist for two-week coding projects. Not a real person.",
  }),
  worker("worker-hana-okafor", "Hana Okafor", DC, {
    occupation: "three-week contractor",
    offers: ["three-week project", "3-week project", "can do this work"],
    seeks: ["3-week project"],
    rate: 4600,
    durationWeeks: 3,
    desc: "DEMO synthetic contractor for three-week projects. Not a real person.",
  }),
  worker("worker-imani-reed", "Imani Reed", DC, {
    occupation: "consultant",
    offers: ["consulting", "can do this work for under $5,000", "looking for work"],
    seeks: ["consulting gig"],
    rate: 4900,
    desc: "DEMO synthetic consultant under $5,000. Not a real person.",
  }),
  worker("worker-jules-berg", "Jules Berg", DC, {
    occupation: "AI engineer",
    offers: ["AI engineering in Washington", "can do this work", "hiring-grade AI people"],
    seeks: ["AI role in Washington"],
    rate: 5500,
    start: "immediate",
    desc: "DEMO synthetic AI engineer in Washington. Not a real person.",
  }),
  worker("worker-kira-sol", "Kira Sol", DC, {
    occupation: "remote coder",
    offers: ["remote coding", "can do this work", "two-week coding project"],
    seeks: ["remote gig"],
    rate: 3700,
    durationWeeks: 2,
    attributesExtra: { remote: true },
    desc: "DEMO synthetic remote coder (DC-tagged, remote=true). Not a real person.",
  }),
  worker("worker-leon-park", "Leon Park", DC, {
    occupation: "ops plus light code",
    offers: ["better fit but less obvious", "ops and scripts", "can do this work"],
    seeks: ["who else should I recruit"],
    rate: 3200,
    desc: "DEMO synthetic less-obvious fit — ops who can also ship scripts. Not a real person.",
  }),
  worker("worker-mira-adel", "Mira Adel", DC, {
    occupation: "available now",
    offers: ["can start immediately", "can do this work", "backend"],
    seeks: ["immediate start"],
    rate: 3800,
    start: "immediate",
    desc: "DEMO synthetic worker who can start immediately. Not a real person.",
  }),
  worker("worker-nico-brandt", "Nico Brandt", BERLIN, {
    occupation: "ML freelancer",
    offers: ["ML engineering", "can do this work", "Berlin"],
    seeks: ["ML role"],
    rate: 5200,
    desc: "DEMO synthetic Berlin ML freelancer. Not a real person.",
  }),
  worker("worker-owen-daly", "Owen Daly", NYC, {
    occupation: "designer freelancer",
    offers: ["product design", "can do this work"],
    seeks: ["design role"],
    rate: 4400,
    desc: "DEMO synthetic NYC designer. Not a real person.",
  }),
  worker("worker-pia-shore", "Pia Shore", DC, {
    occupation: "weekend gigs",
    offers: ["weekend gig", "can do this work", "local task", "website redesign", "redesign my website"],
    seeks: ["weekend work"],
    rate: 500,
    desc: "DEMO synthetic weekend worker. Not a real person.",
  }),
];

function worker(
  id: string,
  name: string,
  location: typeof DC,
  opts: {
    occupation: string;
    offers: string[];
    seeks: string[];
    rate: number;
    desc: string;
    durationWeeks?: number;
    start?: string;
    evidence?: Record<string, unknown>;
    attributesExtra?: Record<string, unknown>;
  },
): Entity {
  return base({
    id,
    type: "human",
    name,
    description: opts.desc,
    offers: opts.offers,
    seeks: opts.seeks,
    location,
    availability: opts.start === "immediate" ? "immediate" : "open",
    attributes: {
      synthetic: true,
      role: "worker",
      occupation: opts.occupation,
      rate: opts.rate,
      currency: "USD",
      durationWeeks: opts.durationWeeks,
      start: opts.start,
      ...opts.attributesExtra,
    },
    metadata: meta("jobs", "DEMO synthetic job worker"),
    trust: opts.evidence
      ? trust("evidence", "evidence stub — not a reputation market", opts.evidence)
      : trust("stub", "synthetic worker"),
    provenance: "synthetic",
  });
}

const applicants: Entity[] = [
  applicant("applicant-quinn-adler", "Quinn Adler", DC, {
    seeks: ["AI engineer role", "looking for a role", "job in Washington"],
    offers: ["AI background", "looking for work"],
    desc: "DEMO synthetic applicant looking for an AI role in Washington. Not a real person.",
    budget: 130000,
  }),
  applicant("applicant-remy-cole", "Remy Cole", DC, {
    seeks: ["two-week coding project", "looking for a gig", "2-week project"],
    offers: ["short-sprint coding"],
    desc: "DEMO synthetic applicant looking for a two-week coding project. Not a real person.",
    budget: 4000,
    durationWeeks: 2,
  }),
  applicant("applicant-sage-liu", "Sage Liu", DC, {
    seeks: ["looking for a role like this", "fullstack role"],
    offers: ["fullstack background"],
    desc: "DEMO synthetic applicant looking for a role like this. Not a real person.",
    budget: 120000,
  }),
  applicant("applicant-tova-nash", "Tova Nash", DC, {
    seeks: ["needs a job", "looking for work", "job in Washington"],
    offers: ["ops plus writing"],
    desc: "DEMO synthetic applicant who needs a job in Washington. Not a real person.",
    budget: 90000,
  }),
  applicant("applicant-uma-patel", "Uma Patel", DC, {
    seeks: ["looking for work", "consulting", "gig under $5000"],
    offers: ["consulting"],
    desc: "DEMO synthetic applicant looking for consulting work. Not a real person.",
    budget: 4800,
  }),
  applicant("applicant-vic-romero", "Vic Romero", DC, {
    seeks: ["looking for a gig", "work for under $5,000"],
    offers: ["small-project shipping"],
    desc: "DEMO synthetic applicant looking for a gig under $5,000. Not a real person.",
    budget: 4500,
  }),
  applicant("applicant-wren-soto", "Wren Soto", DC, {
    seeks: ["can start immediately", "looking for a role", "immediate start"],
    offers: ["available immediately"],
    desc: "DEMO synthetic applicant who can start immediately. Not a real person.",
    budget: 85000,
    start: "immediate",
  }),
  applicant("applicant-yani-cruz", "Yani Cruz", DC, {
    seeks: ["hybrid human-AI team", "looking for a role", "human or AI"],
    offers: ["works with agents"],
    desc: "DEMO synthetic applicant looking for a hybrid human/AI crew. Not a real person.",
    budget: 100000,
  }),
];

function applicant(
  id: string,
  name: string,
  location: typeof DC,
  opts: {
    seeks: string[];
    offers: string[];
    desc: string;
    budget: number;
    durationWeeks?: number;
    start?: string;
  },
): Entity {
  return base({
    id,
    type: "human",
    name,
    description: opts.desc,
    offers: opts.offers,
    seeks: opts.seeks,
    location,
    availability: opts.start === "immediate" ? "immediate" : "searching",
    attributes: {
      synthetic: true,
      role: "applicant",
      budget: opts.budget,
      currency: "USD",
      durationWeeks: opts.durationWeeks,
      start: opts.start,
    },
    metadata: meta("jobs", "DEMO synthetic job applicant"),
    trust: trust("stub", "synthetic applicant"),
    provenance: "synthetic",
  });
}

function jobAgent(
  id: string,
  name: string,
  offers: string[],
  seeks: string[],
  extra: Record<string, unknown>,
): Entity {
  return base({
    id,
    type: "agent",
    name,
    description: `${name} is a labeled AI worker, not a human. DEMO synthetic capability for jobs/gigs.`,
    offers,
    seeks,
    availability: "always on",
    attributes: {
      owner: "synthetic-lab",
      isAI: true,
      role: "worker",
      tools: offers.slice(0, 2),
      permissions: ["discover", "invoke-stub"],
      contextAccess: "declared-offers-only",
      geoLegal: "synthetic-demo",
      apiEndpoint: `/api/agents/${id}/invoke`,
      mcpEndpoint: "/api/mcp",
      endpoint: `/api/agents/${id}/invoke`,
      authRequirements: { type: "none", note: "open demo stub — not a credential market" },
      availability: "always on",
      latency: "seconds",
      reliability: 0.9,
      reputation: "unscored-stub",
      delegation: "whoelse.find",
      ...extra,
    },
    metadata: {
      isAI: true,
      aiDisclosure: "This is an agent, not a human.",
      vertical: "jobs",
      scale: "2026-verticals",
      demoLabel: "DEMO synthetic AI worker",
    },
    trust: {
      status: extra.trustStatus ?? "stub",
      provenance: "ai_generated",
      notes: "agent-as-worker — ranked beside humans, not a person",
      ...(extra.evidence ? { evidence: extra.evidence } : {}),
    },
    provenance: "ai_generated",
  });
}

const jobAgents = [
  jobAgent(
    "agent-codesmith",
    "CodeSmith",
    ["two-week coding project", "can do this work", "can do this work for under $5,000", "AI engineer coding", "human or AI"],
    ["coding tasks to delegate", "fallback if I fail"],
    {
      rate: 900,
      priceUsd: 12,
      latencyMs: 2400,
      fallbackTo: ["agent-fallback-coder", "agent-failover"],
      start: "immediate",
      durationWeeks: 2,
    },
  ),
  jobAgent(
    "agent-gigwright",
    "Gigwright",
    ["3-week project", "short gig runner", "can do this work", "can do this work for under $5,000", "can do this task"],
    ["scoped projects"],
    { rate: 700, priceUsd: 8, latencyMs: 1800, durationWeeks: 3, fallbackTo: ["agent-codesmith"] },
  ),
  jobAgent(
    "agent-reviewer",
    "Reviewer",
    ["code review", "can do this work", "verify this result"],
    ["diffs to review"],
    { rate: 200, priceUsd: 2, latencyMs: 900, fallbackTo: ["agent-verifier"] },
  ),
  jobAgent(
    "agent-hirescout",
    "HireScout",
    ["who else should I recruit", "recruiting assistance", "less obvious hire"],
    ["req to match"],
    { rate: 150, priceUsd: 1, latencyMs: 700, fallbackTo: ["agent-delegate"] },
  ),
  jobAgent(
    "agent-paircoder",
    "PairCoder",
    ["pair programming", "can do this work", "two-week coding project"],
    ["humans to pair with"],
    { rate: 600, priceUsd: 6, latencyMs: 1500, durationWeeks: 2, fallbackTo: ["agent-codesmith"] },
  ),
  jobAgent(
    "agent-immediatebot",
    "ImmediateBot",
    ["can start immediately", "can do this work", "immediate start"],
    ["urgent tasks"],
    { rate: 400, priceUsd: 4, latencyMs: 400, start: "immediate", fallbackTo: ["agent-cheap-runner"] },
  ),
  jobAgent(
    "agent-budgetcoder",
    "BudgetCoder",
    ["can do this work", "can do this work for under $5,000", "cheap coding", "project under $5000", "website redesign", "redesign my website"],
    ["budget tasks"],
    { rate: 800, priceUsd: 5, latencyMs: 3000, fallbackTo: ["agent-cheap-runner"] },
  ),
  jobAgent(
    "agent-domainhopper",
    "DomainHopper",
    ["better fit but less obvious", "career-transfer matching", "can do this work"],
    ["odd-fit reqs"],
    { rate: 300, priceUsd: 3, latencyMs: 1100, fallbackTo: ["agent-hirescout"] },
  ),
  jobAgent(
    "agent-fallback-coder",
    "FallbackCoder",
    ["take over if CodeSmith fails", "can do this work", "failover coding"],
    ["failed coding tasks"],
    { rate: 500, priceUsd: 4, latencyMs: 2000, fallbackTo: ["agent-failover"] },
  ),
];

function ride(
  id: string,
  name: string,
  role: "driver" | "passenger",
  origin: string,
  destination: string,
  opts: {
    desc: string;
    seats?: number;
    state?: string;
    price?: number;
    when?: string;
    location?: typeof DC;
    type?: string;
  },
): Entity {
  const isDriver = role === "driver";
  return base({
    id,
    type: opts.type ?? "service",
    name,
    description: opts.desc,
    offers: isDriver
      ? ["ride", "give me a ride", "local transport", `${origin} to ${destination}`, "seats"]
      : ["need a ride", "passenger"],
    seeks: isDriver ? ["passengers", "ride requests"] : ["ride", "seat", `${origin} to ${destination}`],
    location: opts.location ?? DC,
    availability: opts.when ?? "scheduled",
    attributes: {
      synthetic: true,
      role,
      origin,
      destination,
      seats: opts.seats ?? (isDriver ? 2 : 1),
      state: opts.state ?? "open",
      price: opts.price ?? (isDriver ? 18 : 20),
      currency: "USD",
      departAt: opts.when ?? "Saturday",
    },
    metadata: meta("rides", "DEMO synthetic ride"),
    trust: trust("stub", "synthetic ride — not a real driver or passenger"),
    provenance: "synthetic",
  });
}

const rides = [
  ride("ride-georgetown-dupont", "Ride Georgetown → Dupont", "driver", "Georgetown", "Dupont", {
    desc: "DEMO synthetic ride. 3 seats Saturday Georgetown to Dupont. Not a real driver.",
    seats: 3,
    state: "open",
    price: 12,
    when: "Saturday",
  }),
  ride("ride-dupont-airport", "Ride Dupont → Airport", "driver", "Dupont", "Airport", {
    desc: "DEMO synthetic ride to the airport from Dupont. Not a real driver.",
    seats: 2,
    state: "open",
    price: 28,
    when: "weekday morning",
  }),
  ride("ride-dc-moab", "Ride DC → Moab Saturday", "driver", "Washington", "Moab", {
    desc: "DEMO synthetic long ride DC to Moab Saturday. Not a real driver.",
    seats: 2,
    state: "open",
    price: 80,
    when: "Saturday",
  }),
  ride("ride-shaw-mall", "Shaw → National Mall", "driver", "Shaw", "National Mall", {
    desc: "DEMO synthetic local ride. Not a real driver.",
    seats: 3,
    state: "open",
    price: 10,
  }),
  ride("ride-adams-union", "Adams Morgan → Union Station", "driver", "Adams Morgan", "Union Station", {
    desc: "DEMO synthetic ride to Union Station. Not a real driver.",
    seats: 1,
    state: "open",
    price: 14,
  }),
  ride("ride-foggy-full", "Foggy Bottom → Georgetown (full)", "driver", "Foggy Bottom", "Georgetown", {
    desc: "DEMO synthetic ride that is already full — changing state. Not a real driver.",
    seats: 0,
    state: "full",
    price: 11,
  }),
  ride("ride-completed-stub", "Yesterday's completed hop", "driver", "Capitol Hill", "Navy Yard", {
    desc: "DEMO synthetic completed ride. Should not win 'who else can give me a ride'.",
    seats: 0,
    state: "completed",
    price: 9,
    when: "yesterday",
  }),
  ride("ride-departing-navy", "Capitol → Navy Yard departing", "driver", "Capitol Hill", "Navy Yard", {
    desc: "DEMO synthetic ride departing soon. State=departing. Not a real driver.",
    seats: 1,
    state: "departing",
    price: 8,
    when: "now",
  }),
  ride("ride-berlin-txl", "Mitte → Airport", "driver", "Mitte", "Airport", {
    desc: "DEMO synthetic Berlin ride. Not a real driver.",
    seats: 2,
    state: "open",
    price: 22,
    location: BERLIN,
  }),
  ride("ride-human-priya", "Priya (human driver)", "driver", "Petworth", "Georgetown", {
    desc: "DEMO synthetic human offering a seat. Type is human, role is driver. Not a real person.",
    seats: 2,
    state: "open",
    price: 15,
    type: "human",
  }),
  ride("ride-need-airport", "Needs airport seat", "passenger", "Dupont", "Airport", {
    desc: "DEMO synthetic passenger who needs a ride to the airport. Not a real person.",
    type: "human",
    seats: 1,
    price: 30,
  }),
  ride("ride-need-moab", "Needs Moab Saturday seat", "passenger", "Washington", "Moab", {
    desc: "DEMO synthetic passenger for DC to Moab Saturday. Not a real person.",
    type: "human",
    seats: 1,
    when: "Saturday",
  }),
  ride("ride-need-georgetown", "Needs Georgetown → Dupont", "passenger", "Georgetown", "Dupont", {
    desc: "DEMO synthetic passenger Georgetown to Dupont. Not a real person.",
    type: "human",
    seats: 1,
    when: "Saturday",
  }),
  ride("ride-need-two-seats", "Needs two downtown seats", "passenger", "Shaw", "National Mall", {
    desc: "DEMO synthetic party needing 2 seats downtown. Not real people.",
    type: "human",
    seats: 2,
  }),
  ride("ride-need-lastmin", "Last-minute passenger", "passenger", "Adams Morgan", "Union Station", {
    desc: "DEMO synthetic last-minute passenger. Not a real person.",
    type: "human",
    seats: 1,
    when: "now",
  }),
  ride("ride-need-berlin", "Needs Mitte → Airport", "passenger", "Mitte", "Airport", {
    desc: "DEMO synthetic Berlin passenger. Not a real person.",
    type: "human",
    location: BERLIN,
    seats: 1,
  }),
];

function svc(
  id: string,
  name: string,
  role: "provider" | "client",
  trade: string,
  opts: {
    desc: string;
    licensed?: boolean;
    urgency?: string;
    rate?: number;
    location?: typeof DC;
    type?: string;
    start?: string;
  },
): Entity {
  const provider = role === "provider";
  return base({
    id,
    type: opts.type ?? (provider ? "service" : "human"),
    name,
    description: opts.desc,
    offers: provider
      ? [trade, "can fix a leak", "handyman", "repair", opts.licensed ? "licensed" : "unlicensed"]
      : ["need a plumber", "need a handyman"],
    seeks: provider ? ["clients", "leaks", "repair jobs"] : [trade, "fix a leak", "before the weekend"],
    location: opts.location ?? DC,
    availability: opts.start ?? (opts.urgency === "emergency" ? "now" : "this week"),
    attributes: {
      synthetic: true,
      role,
      trade,
      licensed: Boolean(opts.licensed),
      urgency: opts.urgency ?? (provider ? "normal" : "emergency"),
      rate: opts.rate ?? (provider ? 180 : 200),
      currency: "USD",
      start: opts.start,
    },
    metadata: meta("services", "DEMO synthetic service"),
    trust: opts.licensed
      ? trust("evidence", "license stub — not a real credential", {
          verified: true,
          verifiedBy: "demo-license-stub",
          licenses: [`${trade}-DC-DEMO`],
        })
      : trust("stub", "synthetic service — not a real tradesperson"),
    provenance: "synthetic",
  });
}

const services = [
  svc("service-dc-emergency-plumber", "Capitol Leak Co (licensed)", "provider", "plumber", {
    desc: "DEMO synthetic licensed emergency plumber in Washington. Can fix a leak under a sink before the weekend. Not a real plumber.",
    licensed: true,
    urgency: "emergency",
    rate: 220,
    start: "immediate",
  }),
  svc("service-adams-handyman", "Adams Morgan Handyman", "provider", "handyman", {
    desc: "DEMO synthetic licensed handyman in Adams Morgan. Not a real person.",
    licensed: true,
    rate: 140,
  }),
  svc("service-shaw-plumber", "Shaw Weekend Plumbing", "provider", "plumber", {
    desc: "DEMO synthetic plumber available before the weekend. Not real.",
    licensed: true,
    urgency: "emergency",
    rate: 190,
  }),
  svc("service-unlicensed-cheap", "Cash-only Patch (unlicensed)", "provider", "plumber", {
    desc: "DEMO synthetic unlicensed cheaper option — trust contrast, not a recommendation. Not a real plumber.",
    licensed: false,
    rate: 80,
  }),
  svc("service-berlin-plumber", "Mitte Rohr Frei", "provider", "plumber", {
    desc: "DEMO synthetic licensed Berlin plumber. Not real.",
    licensed: true,
    location: BERLIN,
    rate: 160,
  }),
  svc("service-foggy-leak", "Foggy Bottom Leak Specialist", "provider", "plumber", {
    desc: "DEMO synthetic leak specialist. Not real.",
    licensed: true,
    urgency: "emergency",
    rate: 210,
  }),
  svc("service-dupont-handy", "Dupont Handy", "provider", "handyman", {
    desc: "DEMO synthetic Dupont handyman. Not real.",
    licensed: true,
    rate: 130,
  }),
  svc("service-afterhours", "After-hours DC Plumber", "provider", "plumber", {
    desc: "DEMO synthetic after-hours plumber. Not real.",
    licensed: true,
    urgency: "emergency",
    rate: 260,
    start: "immediate",
  }),
  svc("client-dc-sink", "Urgent sink leak (client)", "client", "plumber", {
    desc: "DEMO synthetic client: leak under the sink before the weekend. Not a real person.",
    urgency: "emergency",
    rate: 200,
  }),
  svc("client-weekend-handy", "Needs weekend handyman", "client", "handyman", {
    desc: "DEMO synthetic client who needs a handyman before the weekend. Not real.",
    urgency: "emergency",
    rate: 150,
  }),
  svc("client-berlin-leak", "Mitte leak client", "client", "plumber", {
    desc: "DEMO synthetic Berlin leak client. Not real.",
    location: BERLIN,
    urgency: "emergency",
    rate: 170,
  }),
  svc("client-licensed-only", "Licensed-only leak client", "client", "plumber", {
    desc: "DEMO synthetic client who will only hire licensed. Not real.",
    urgency: "emergency",
    rate: 240,
  }),
  svc("client-budget-leak", "Budget leak fix", "client", "plumber", {
    desc: "DEMO synthetic client with a tight budget. Not real.",
    rate: 90,
  }),
  svc("client-georgetown-faucet", "Georgetown faucet", "client", "handyman", {
    desc: "DEMO synthetic Georgetown faucet repair. Not real.",
    rate: 120,
  }),
  svc("client-emergency", "Emergency client DC", "client", "plumber", {
    desc: "DEMO synthetic emergency plumbing client. Not real.",
    urgency: "emergency",
    rate: 250,
    start: "immediate",
  }),
];

const factory = buildFactoryEntities();

function deepenAgents(entities: Entity[]) {
  const extras: Record<string, Record<string, unknown>> = {
    "agent-pdf-summarizer": { latencyMs: 1200, priceUsd: 0.4, reliability: 0.93, fallbackTo: ["agent-delegate"] },
    "agent-web-browser": { latencyMs: 2200, priceUsd: 0.6, reliability: 0.88, fallbackTo: ["agent-capability-index"] },
    "agent-translator-de-en": { latencyMs: 800, priceUsd: 0.2, reliability: 0.95, fallbackTo: ["agent-delegate"] },
    "agent-verifier": { latencyMs: 1500, priceUsd: 0.5, reliability: 0.9, fallbackTo: ["agent-reviewer"] },
    "agent-cheap-runner": { latencyMs: 4000, priceUsd: 0.05, reliability: 0.8, fallbackTo: ["agent-workflow"] },
    "agent-workflow": { latencyMs: 1800, priceUsd: 0.7, reliability: 0.87, fallbackTo: ["agent-delegate"] },
    "agent-failover": { latencyMs: 600, priceUsd: 0.3, reliability: 0.92, fallbackTo: ["agent-delegate"] },
    "agent-capability-index": { latencyMs: 350, priceUsd: 0.1, reliability: 0.96, fallbackTo: ["agent-delegate"] },
    "agent-delegate": { latencyMs: 500, priceUsd: 0.15, reliability: 0.94, fallbackTo: ["agent-failover"] },
  };
  for (const e of entities) {
    const add = extras[e.id];
    if (!add) continue;
    const attrs = { ...(e.attributes as Record<string, unknown>), ...add, delegation: "whoelse.find" };
    e.attributes = attrs;
  }
}

function patchLegacyRide(entities: Entity[]) {
  const ride = entities.find((e) => e.id === "service-dc-ride");
  if (!ride) return;
  const attrs = {
    ...(ride.attributes as Record<string, unknown>),
    role: "driver",
    origin: "Washington",
    destination: "Trails",
    seats: 3,
    state: "open",
    price: 16,
    currency: "USD",
  };
  ride.attributes = attrs;
  ride.offers = [...new Set([...(ride.offers as string[]), "give me a ride", "seats", "local transport"])];
}

function main() {
  const raw = JSON.parse(readFileSync(SEED, "utf8")) as { entities: Entity[] };
  deepenAgents(raw.entities);
  patchLegacyRide(raw.entities);

  const incoming = [
    ...companies,
    ...openings,
    ...workers,
    ...applicants,
    ...jobAgents,
    ...rides,
    ...services,
    ...factory,
  ];
  const incomingIds = new Set(incoming.map((e) => e.id));
  const kept = raw.entities.filter((e) => {
    const scale = (e.metadata as { scale?: string } | undefined)?.scale;
    if (scale === "2026-verticals") return false;
    return !incomingIds.has(e.id);
  });

  const next = { entities: [...kept, ...incoming] };
  writeFileSync(SEED, `${JSON.stringify(next, null, 2)}\n`);

  const count = (v: string) => incoming.filter((e) => (e.metadata as { vertical?: string }).vertical === v).length;
  console.log(
    `seed ${raw.entities.length} → ${next.entities.length} jobs=${count("jobs")} rides=${count("rides")} services=${count("services")} products=${count("products")} experts=${count("experts")} capital=${count("capital")} travel=${count("travel")} events=${count("events")} childcare=${count("childcare")} collab=${count("collab")} compute=${count("compute")} data=${count("data")} local=${count("local")}`,
  );
}

main();
