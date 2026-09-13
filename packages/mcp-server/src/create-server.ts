import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  AuthzError,
  IdentityLedger,
  RESERVED_ENTITY_TYPES,
  SEEDED_ENTITY_TYPES,
  WhoElseNetwork,
  gatewayAct,
  gatewayDelegate,
  gatewayFeedback,
  gatewayGetMatch,
  gatewayInvoke,
  gatewayListMatches,
  gatewayProposeMatch,
  gatewayPublish,
  gatewayRegister,
  gatewayReputation,
  gatewayWriteReceipt,
  requireCaller,
  toMachineFindResult,
  type Caller,
  type WhoElseEngine,
  type WhoElseMode,
} from "@whoelse/core";
import { z } from "zod";

const pubObject = z.object({
  id: z.string().optional(),
  capability: z.string(),
  phrases: z.array(z.string()).optional(),
  status: z.enum(["active", "withdrawn", "expired"]).optional(),
  constraints: z
    .array(
      z.object({
        key: z.string(),
        op: z.enum(["eq", "lte", "gte", "includes", "truthy", "neq"]),
        value: z.unknown().optional(),
      }),
    )
    .optional(),
});
const bagItem = z.union([z.string(), pubObject]);
const modeSchema = z.enum(["substitute", "expand", "peers"]).optional();
const typeSchema = z
  .string()
  .optional()
  .describe(
    `Optional entity type filter. Seeded: ${SEEDED_ENTITY_TYPES.join(", ")}. Reserved: ${RESERVED_ENTITY_TYPES.join(", ")}.`,
  );

export const findInput = {
  intent: z
    .string()
    .optional()
    .describe("Natural-language intent. Alias of context. e.g. 'Who else can summarize this PDF?'"),
  context: z.string().optional().describe("Same as intent (human-surface wording)"),
  requester: z
    .string()
    .optional()
    .describe("Entity id of the caller — excluded from results; their SEEKs/OFFERs pair against candidates"),
  predicate: z.string().optional().describe("Optional relation / extra clause"),
  type: typeSchema,
  city: z.string().optional(),
  location: z.string().optional().describe("Free-text location; treated as city when possible"),
  availability: z.string().optional(),
  side: z
    .enum(["offer", "seek"])
    .optional()
    .describe("Marketplace direction: offer = who HAS it, seek = who NEEDS it. Inferred from intent when omitted."),
  exclude: z.array(z.string()).optional(),
  knownEntities: z.array(z.string()).optional().describe("Ids already known / shown"),
  entityId: z.string().optional().describe("Exemplar id — recursive more-like without a second tool"),
  matchId: z
    .string()
    .optional()
    .describe("Recursive Who else? from an existing MATCH. Excludes both parties and carries the match query."),
  limit: z.number().int().min(1).max(20).optional(),
  mode: modeSchema.describe("substitute | expand | peers. Default expand."),
  ranking: z.enum(["score", "sectioned"]).optional(),
  minTrust: z.enum(["any", "unscored", "stub", "evidence"]).optional(),
  roles: z
    .array(z.string())
    .optional()
    .describe("Optional marketplace roles: opening, employer, worker, applicant, driver, passenger, provider, client. Inferred from intent when omitted."),
};

export const FIND_DESCRIPTION =
  "Primary discovery tool (whoelse.find). Returns entity candidates plus high-confidence OFFER↔SEEK pairs. Same engine as the consumer Who else? UI. Dating, apartment, jobs, and the factory lenses are costumes, not tools. Never call products.find or jobs.find — they do not exist.";

type FindArgs = {
  intent?: string;
  context?: string;
  requester?: string;
  predicate?: string;
  type?: string;
  city?: string;
  location?: string;
  availability?: string;
  side?: "offer" | "seek";
  exclude?: string[];
  knownEntities?: string[];
  entityId?: string;
  matchId?: string;
  limit?: number;
  mode?: WhoElseMode;
  ranking?: "score" | "sectioned";
  minTrust?: "any" | "unscored" | "stub" | "evidence";
  roles?: string[];
};

function json(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function asNetwork(source: WhoElseEngine | WhoElseNetwork): WhoElseNetwork {
  if (source instanceof WhoElseNetwork) return source;
  return WhoElseNetwork.memory(
    source,
    IdentityLedger.forSyntheticSeed(source.store.all().map((e) => e.id)),
  );
}

function authJson(err: unknown) {
  if (err instanceof AuthzError) return json({ error: err.message, status: err.status });
  return json({ error: err instanceof Error ? err.message : String(err), status: 400 });
}

/** Same tools on stdio and Streamable HTTP. Writes require a Clerk/agent caller. */
export function createWhoElseMcpServer(
  source: WhoElseEngine | WhoElseNetwork,
  options: { caller?: Caller | null } = {},
): McpServer {
  const network = asNetwork(source);
  const engine = network.engine;
  const caller = options.caller ?? null;
  const server = new McpServer({
    name: "whoelse",
    version: "0.3.0",
  });

  async function find(args: FindArgs) {
    const context = (args.intent ?? args.context ?? "").trim();
    if (!context && !args.entityId && !args.matchId) {
      return json({ error: "intent, entityId, or matchId required" });
    }
    if (args.requester) {
      try {
        requireCaller(caller);
        network.identity.assertOwns(caller, args.requester);
      } catch (err) {
        return authJson(err);
      }
    }
    if (args.matchId) {
      const existing = engine.store.match(args.matchId);
      if (!existing) return json({ error: `Unknown match ${args.matchId}`, status: 404 });
    }
    const result = await engine.whoelseAsync({
      context: context || (args.matchId ? "" : "Who else like this?"),
      predicate: args.predicate,
      requester: args.requester,
      constraints: {
        type: args.type,
        city: args.city ?? args.location,
        limit: args.limit,
        side: args.side,
        roles: args.roles,
      },
      exclude: args.exclude,
      knownEntities: args.knownEntities,
      entityId: args.entityId,
      matchId: args.matchId,
      mode: args.mode,
      limit: args.limit,
      availability: args.availability,
      ranking: args.ranking,
      minTrust: args.minTrust,
    });
    return json(toMachineFindResult(result));
  }

  server.tool("whoelse.find", FIND_DESCRIPTION, findInput, find);
  server.tool("whoelse_find", "Alias of whoelse.find for clients that prefer underscores.", findInput, find);
  server.tool(
    "whoelse.feedback",
    "Optional: record more/less on an entity for this process. Not a reputation graph.",
    {
      entityId: z.string(),
      signal: z.enum(["more", "less"]),
      query: z.string().optional(),
    },
    async ({ entityId, signal, query }) => {
      const result = await gatewayFeedback(network, { entityId, signal, query }, caller);
      return json(result.body);
    },
  );

  server.tool(
    "whoelse.register",
    "Register or update an entity on the shared WhoElse network and publish at least one OFFER and/or SEEK. Idempotent on id. Strings or {capability, phrases, constraints}. Not a vertical tool — never jobs.register. 505 catalog IDs are not a runtime enum.",
    {
      name: z.string(),
      description: z.string(),
      offers: z.array(bagItem).optional(),
      seeks: z.array(bagItem).optional(),
      type: z.string().optional(),
      id: z.string().optional(),
      owner: z.string().optional(),
      version: z.string().optional(),
      status: z.string().optional(),
      protocol: z.string().optional(),
      requirements: z.array(z.string()).optional(),
      permissions: z.array(z.string()).optional(),
      cost: z.union([z.number(), z.string()]).optional(),
      latency: z.union([z.number(), z.string()]).optional(),
      availability: z.string().optional(),
      endpoint: z
        .object({
          protocol: z.enum(["http", "mcp", "stub"]).optional(),
          url: z.string(),
          auth: z.string().optional(),
        })
        .optional(),
    },
    async (spec) => {
      if (!spec.offers?.length && !spec.seeks?.length) {
        return json({ error: "register requires at least one offer or seek", status: 400 });
      }
      const result = await gatewayRegister(
        network,
        {
          ...spec,
          endpoint: spec.endpoint
            ? { protocol: spec.endpoint.protocol ?? "http", url: spec.endpoint.url, auth: spec.endpoint.auth }
            : undefined,
        },
        caller,
      );
      if (!result.ok) return json(result.body);
      return json({
        ok: true,
        entity: result.body.entity,
        agentKey: result.body.agentKey,
        next: {
          find: "whoelse.find",
          invoke: `POST /api/agents/${result.body.entity.id}/invoke`,
          publish: "whoelse.publish",
        },
      });
    },
  );

  server.tool(
    "whoelse.publish",
    "Attach or update first-class OFFER / SEEK records on an existing entity. Idempotent on (entityId, kind, capability). Same network as whoelse.find — not a vertical tool.",
    {
      entityId: z.string(),
      publications: z
        .array(
          pubObject.extend({
            kind: z.enum(["offer", "seek"]),
          }),
        )
        .min(1),
    },
    async ({ entityId, publications }) => {
      const result = await gatewayPublish(network, entityId, publications, caller);
      if (!result.ok) return json(result.body);
      return json({
        ok: true,
        entity: result.body.entity,
        next: { find: "whoelse.find" },
      });
    },
  );

  server.tool(
    "whoelse.invoke",
    "Invoke a registered or seeded agent. Demo stub returns a structured result + receipt. Same network as whoelse.find.",
    {
      entityId: z.string(),
      task: z.string(),
    },
    async ({ entityId, task }) => {
      const result = await gatewayInvoke(network, entityId, { task }, caller);
      return json(result.body);
    },
  );

  server.tool(
    "whoelse.delegate",
    "Agent A cannot do a task: whoelse.find candidates, select, invoke Agent B, return result + evidence receipt. Headline agent-to-agent demo. Never jobs.find.",
    {
      task: z.string(),
      intent: z.string().optional().describe("Find sentence. Defaults to task."),
      from: z.string().optional().describe("Requester / Agent A id"),
      select: z.enum(["first", "cheapest", "fastest", "evidence"]).optional(),
      limit: z.number().int().min(1).max(20).optional(),
    },
    async ({ task, intent, from, select, limit }) => {
      const result = await gatewayDelegate(network, { task, intent, from, select, limit }, caller);
      if (!result.ok) return json(result.body);
      const delegated = result.body;
      return json({
        ok: delegated.ok,
        task: delegated.task,
        intent: delegated.intent,
        from: delegated.from,
        selected: delegated.selected
          ? { id: delegated.selected.entity.id, name: delegated.selected.entity.name, score: delegated.selected.score }
          : undefined,
        invoked: delegated.invoked,
        receipt: delegated.receipt,
        match: delegated.match,
        found: delegated.found.slice(0, 5).map((c) => ({ id: c.entity.id, name: c.entity.name, type: c.entity.type })),
        reason: delegated.reason,
      });
    },
  );

  const actionEnum = z.enum([
    "connect",
    "intro",
    "message",
    "accept",
    "decline",
    "cancel",
    "invoke",
    "delegate",
    "negotiate",
    "handoff",
  ]);
  const receiptStatus = z.enum([
    "proposed",
    "accepted",
    "declined",
    "started",
    "completed",
    "failed",
    "cancelled",
  ]);

  server.tool(
    "whoelse.match",
    "Explicitly propose/save a durable MATCH from find results. Find never writes MATCH rows. One row per SEEK↔OFFER pair. Same objects as the human Matches UI.",
    {
      candidateEntityId: z.string(),
      requesterEntityId: z.string().optional(),
      seekPublicationId: z.string().optional(),
      offerPublicationId: z.string().optional(),
      query: z.string().optional(),
      score: z.number().optional(),
      explanation: z.string().optional(),
    },
    async (args) => {
      const result = await gatewayProposeMatch(
        network,
        {
          candidateEntityId: args.candidateEntityId,
          requesterEntityId: args.requesterEntityId,
          seekPublicationId: args.seekPublicationId,
          offerPublicationId: args.offerPublicationId,
          query: args.query,
          score: args.score,
          explanation: args.explanation ? { why: args.explanation } : undefined,
        },
        caller,
      );
      return json(result.body);
    },
  );

  server.tool(
    "whoelse.act",
    "Act on a MATCH: connect / intro / message / accept / decline / invoke / delegate / negotiate / handoff. Writes a structured receipt. Same path as the human UI.",
    {
      matchId: z.string(),
      action: actionEnum,
      actorEntityId: z.string().optional(),
      message: z.string().optional(),
      task: z.string().optional(),
    },
    async (args) => {
      const result = await gatewayAct(network, args, caller);
      return json(result.body);
    },
  );

  server.tool(
    "whoelse.receipt",
    "Write a structured receipt (proposed|accepted|declined|started|completed|failed|cancelled). Outcomes update portable reputation. Not dating-specific.",
    {
      counterpartyEntityId: z.string(),
      actionType: actionEnum,
      status: receiptStatus,
      matchId: z.string().optional(),
      actorEntityId: z.string().optional(),
      task: z.string().optional(),
      outcome: z.record(z.unknown()).optional(),
    },
    async (args) => {
      const result = await gatewayWriteReceipt(network, args, caller);
      return json(result.body);
    },
  );

  server.tool(
    "whoelse.reputation",
    "Inspect receipt-backed reputation for an entity: completion reliability, response/acceptance/failure rates, verified successes, evidence receipt ids. Issued by the network — not self-asserted.",
    {
      entityId: z.string(),
    },
    async ({ entityId }) => {
      const result = await gatewayReputation(network, entityId, caller);
      return json(result.body);
    },
  );

  server.tool(
    "whoelse.matches",
    "List MATCH rows the caller is a party to, or fetch one by id, with receipts and thread messages.",
    {
      matchId: z.string().optional(),
    },
    async ({ matchId }) => {
      if (matchId) {
        const one = await gatewayGetMatch(network, matchId, caller);
        return json(one.body);
      }
      const listed = await gatewayListMatches(network, caller);
      return json(listed.body);
    },
  );

  return server;
}
