#!/usr/bin/env npx tsx
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { WhoElseEngine } from "@whoelse/core";
import { createWhoElseMcpServer } from "./create-server.js";

const engine = WhoElseEngine.fromSeed();
const server = createWhoElseMcpServer(engine);
const transport = new StdioServerTransport();
await server.connect(transport);
process.stderr.write("whoelse MCP server listening on stdio (primary tool: whoelse.find)\n");
