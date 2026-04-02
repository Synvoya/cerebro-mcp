#!/usr/bin/env node
// Copyright (c) 2026 Synvoya. Apache-2.0 License.
// Cerebro MCP — The brain that builds
// Universal AI orchestrator: MCP for tools, A2A for agents.

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createCerebroServer } from "./server.js";

async function main(): Promise<void> {
  const server = createCerebroServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Cerebro MCP server running on stdio");
  console.error("Version: 0.1.0");
  console.error("The brain that builds.");
}

main().catch((error) => {
  console.error("Fatal error starting Cerebro MCP:", error);
  process.exit(1);
});
