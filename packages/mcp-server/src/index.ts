#!/usr/bin/env npx tsx
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  RESERVED_ENTITY_TYPES,
  SEEDED_ENTITY_TYPES,
  WhoElseEngine,
  toMachineFindResult,
  type WhoElseMode,
} from "@whoelse/core";
import { z } from "zod";

const engine = WhoElseEngine.fromSeed();

const modeSchema = z.enum(["substitute", "expand", "peers"]).optional();
const typeSchema = z
  .string()
  .optional()
  .describe(
    `Optional entity type filter. Seeded: ${SEEDED_ENTITY_TYPES.join(", ")}. Reserved: ${RESERVED_ENTITY_TYPES.join(", ")}.`,
  );

const findInput = {
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
  exclude: z.array(z.string()).optional(),
  knownEntities: z.array(z.string()).optional().describe("Ids already known / shown"),
  entityId: z.string().optional().describe("Exemplar id — recursive more-like without a second tool"),
  limit: z.number().int().min(1).max(20).optional(),
  mode: modeSchema.describe("substitute | expand | peers. Default expand."),
  ranking: z.enum(["score", "sectioned"]).optional(),
  minTrust: z.enum(["any", "unscored", "stub"]).optional(),
};

const server = new McpServer({
  name: "whoelse",
  version: "0.1.0",
});

function json(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

async function find(args: {
  intent?: string;
  context?: string;
  requester?: string;
  predicate?: string;
  type?: string;
  city?: string;
  location?: string;
  availability?: string;
  exclude?: string[];
  knownEntities?: string[];
  entityId?: string;
  limit?: number;
  mode?: WhoElseMode;
  ranking?: "score" | "sectioned";
  minTrust?: "any" | "unscored" | "stub";
}) {
  const context = (args.intent ?? args.context ?? "").trim();
  if (!context && !args.entityId) {
    return json({ error: "intent or entityId required" });
  }
  const result = await engine.whoelseAsync({
    context: context || "Who else like this?",
    predicate: args.predicate,
    requester: args.requester,
    constraints: { type: args.type, city: args.city ?? args.location, limit: args.limit },
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

const findDescription =
  "Primary discovery tool (whoelse.find). Find entities matching an intent — humans, labeled AIs, agents, services, resources. Same engine as the consumer Who else? UI. Dating is one seed, not the contract.";

server.tool("whoelse.find", findDescription, findInput, find);
server.tool(
  "whoelse_find",
  "Alias of whoelse.find for clients that prefer underscores.",
  findInput,
  find,
);

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

const transport = new StdioServerTransport();
await server.connect(transport);
process.stderr.write("whoelse MCP server listening on stdio (primary tool: whoelse.find)\n");
