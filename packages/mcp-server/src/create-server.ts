import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  RESERVED_ENTITY_TYPES,
  SEEDED_ENTITY_TYPES,
  toMachineFindResult,
  type WhoElseEngine,
  type WhoElseMode,
} from "@whoelse/core";
import { z } from "zod";

const pubObject = z.object({
  id: z.string().optional(),
  capability: z.string(),
  phrases: z.array(z.string()).optional(),
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
  requester: z.string().optional().describe("Entity id of the caller — excluded from results"),
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
  "Primary discovery tool (whoelse.find). Find entities matching an intent — humans, labeled AIs, agents, companies, services, resources, products, datasets, communities. Same engine as the consumer Who else? UI. Dating, apartment, jobs, and the factory lenses are costumes, not tools. Never call products.find or jobs.find — they do not exist.";

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

/** Same tools on stdio and Streamable HTTP. Caller supplies the shared engine. */
export function createWhoElseMcpServer(engine: WhoElseEngine): McpServer {
  const server = new McpServer({
    name: "whoelse",
    version: "0.2.0",
  });

  async function find(args: FindArgs) {
    const context = (args.intent ?? args.context ?? "").trim();
    if (!context && !args.entityId) {
      return json({ error: "intent or entityId required" });
    }
    const result = await engine.whoelseAsync({
      context: context || "Who else like this?",
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
      const event = engine.feedback(entityId, signal, query);
      return json({ ok: true, event });
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
        return json({ error: "register requires at least one offer or seek" });
      }
      try {
        const entity = engine.register({
          ...spec,
          endpoint: spec.endpoint
            ? { protocol: spec.endpoint.protocol ?? "http", url: spec.endpoint.url, auth: spec.endpoint.auth }
            : undefined,
        });
        return json({
          ok: true,
          entity: {
            id: entity.id,
            type: entity.type,
            name: entity.name,
            offers: entity.offers,
            seeks: entity.seeks,
            publications: entity.publications?.map((p) => ({
              id: p.id,
              kind: p.kind,
              capability: p.capability,
            })),
          },
          next: { find: "whoelse.find", invoke: `POST /api/agents/${entity.id}/invoke`, publish: "whoelse.publish" },
        });
      } catch (err) {
        return json({ error: err instanceof Error ? err.message : String(err) });
      }
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
      try {
        const entity = engine.publish(entityId, publications);
        return json({
          ok: true,
          entity: {
            id: entity.id,
            name: entity.name,
            publications: entity.publications?.map((p) => ({
              id: p.id,
              kind: p.kind,
              capability: p.capability,
            })),
          },
          next: { find: "whoelse.find" },
        });
      } catch (err) {
        return json({ error: err instanceof Error ? err.message : String(err) });
      }
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
      try {
        const invoked = engine.invoke(entityId, { task });
        return json(invoked);
      } catch (err) {
        return json({ error: err instanceof Error ? err.message : String(err) });
      }
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
      const result = engine.delegate({ task, intent, from, select, limit });
      return json({
        ok: result.ok,
        task: result.task,
        intent: result.intent,
        from: result.from,
        selected: result.selected
          ? { id: result.selected.entity.id, name: result.selected.entity.name, score: result.selected.score }
          : undefined,
        invoked: result.invoked,
        receipt: result.receipt,
        match: result.match,
        found: result.found.slice(0, 5).map((c) => ({ id: c.entity.id, name: c.entity.name, type: c.entity.type })),
        reason: result.reason,
      });
    },
  );

  return server;
}
