#!/usr/bin/env npx tsx
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { WhoElseEngine, type WhoElseMode } from "@whoelse/core";
import { z } from "zod";

const engine = WhoElseEngine.fromSeed();

const modeSchema = z.enum(["substitute", "expand", "peers"]).optional();

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
  "Exemplar-anchored discovery: given a natural-language desire (and optional filters), return ranked humans and clearly labeled AIs.",
  {
    context: z
      .string()
      .describe("What you want more of, e.g. 'Who else wants to build a network of voice assistants?'"),
    predicate: z.string().optional().describe("Optional extra 'more of this' clause"),
    type: z.enum(["human", "ai"]).optional(),
    city: z.string().optional(),
    exclude: z.array(z.string()).optional(),
    mode: modeSchema.describe("substitute | expand | peers. Dating default is expand."),
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
  "Recursive WhoElse: treat an existing entity as the new exemplar and find more like them.",
  {
    entityId: z.string().describe("Entity id to expand from"),
    exclude: z.array(z.string()).optional(),
    mode: modeSchema,
    limit: z.number().int().min(1).max(20).optional(),
  },
  async ({ entityId, exclude, mode, limit }) => {
    const base = engine.moreLike(entityId, {
      exclude,
      mode: mode as WhoElseMode | undefined,
      limit,
    });
    const result = await engine.whoelseAsync({
      context: base.query,
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
  "Explain why a specific candidate matched a query or exemplar.",
  {
    entityId: z.string(),
    context: z.string().describe("Original desire / query text"),
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
  "Record more-like / less-like feedback so later WHOELSE calls shift.",
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
