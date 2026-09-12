#!/usr/bin/env npx tsx
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { RESERVED_ENTITY_TYPES, SEEDED_ENTITY_TYPES, WhoElseEngine, type WhoElseMode } from "@whoelse/core";
import { z } from "zod";

const engine = WhoElseEngine.fromSeed();

const modeSchema = z.enum(["substitute", "expand", "peers"]).optional();
const typeSchema = z
  .string()
  .optional()
  .describe(
    `Optional entity type filter. Seeded: ${SEEDED_ENTITY_TYPES.join(", ")}. Reserved: ${RESERVED_ENTITY_TYPES.join(", ")}. Open-ended string.`,
  );

const server = new McpServer({
  name: "whoelse",
  version: "0.1.0",
});

function json(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

server.tool(
  "whoelse_find",
  "Find entities matching an intent. Domain-agnostic: humans, labeled AIs, agents, services, and other types in the pool. Dating is only the seeded consumer dataset. Same primitive as the human Who else? surface.",
  {
    context: z
      .string()
      .describe("Natural-language intent, e.g. 'Who else can summarize this PDF?' or 'Who else wants a low-key dinner?'"),
    predicate: z.string().optional().describe("Optional extra constraint on the intent (role, relation, capability)"),
    type: typeSchema,
    city: z.string().optional(),
    exclude: z.array(z.string()).optional().describe("Entity ids to skip"),
    mode: modeSchema.describe("substitute | expand | peers. Default expand."),
    limit: z.number().int().min(1).max(20).optional(),
  },
  async ({ context, predicate, type, city, exclude, mode, limit }) => {
    const result = await engine.whoelseAsync({
      context,
      predicate,
      constraints: { type, city, limit },
      exclude,
      mode: mode as WhoElseMode | undefined,
      limit,
    });
    return json(result);
  },
);

server.tool(
  "whoelse_more_like",
  "Treat an existing entity as the new exemplar and find more entities like it. Domain-agnostic recursion of whoelse_find.",
  {
    entityId: z.string().describe("Entity id to expand from"),
    exclude: z.array(z.string()).optional(),
    mode: modeSchema,
    limit: z.number().int().min(1).max(20).optional(),
  },
  async ({ entityId, exclude, mode, limit }) => {
    const result = await engine.whoelseAsync({
      context: `Who else like this?`,
      entityId,
      exclude,
      mode: (mode as WhoElseMode | undefined) ?? "expand",
      limit,
    });
    return json(result);
  },
);

server.tool(
  "whoelse_explain",
  "Explain why a specific entity matched an intent or exemplar. Returns score, why, commonalities, provenance/trust stub.",
  {
    entityId: z.string(),
    context: z.string().describe("Original intent text"),
    entityContextId: z.string().optional().describe("If the query was recursive, the exemplar id"),
  },
  async ({ entityId, context, entityContextId }) => {
    const candidate = engine.explain(entityId, context, entityContextId);
    if (!candidate) return json({ error: "No explanation — entity missing or filtered out" });
    return json(candidate);
  },
);

server.tool(
  "whoelse_feedback",
  "Record more-like / less-like feedback so later discovery calls in this process shift. Not a reputation graph.",
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
process.stderr.write("whoelse MCP server listening on stdio\n");
