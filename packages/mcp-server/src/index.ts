#!/usr/bin/env npx tsx
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { bootNetwork } from "@whoelse/core";
import { createWhoElseMcpServer } from "./create-server.js";

const network = await bootNetwork();
const caller = network.authenticateAgentKey(process.env.WHOELSE_AGENT_KEY ?? "");
const server = createWhoElseMcpServer(network, { caller });
const transport = new StdioServerTransport();
await server.connect(transport);
process.stderr.write(
  `whoelse MCP server listening on stdio (primary tool: whoelse.find; writes ${caller ? "authenticated" : "require WHOELSE_AGENT_KEY"})\n`,
);
