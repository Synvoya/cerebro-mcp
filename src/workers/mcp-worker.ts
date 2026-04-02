// Copyright (c) 2026 Synvoya. Apache-2.0 License.

import type { TaskResult } from "../types/index.js";

interface McpRelayOptions {
  serverName: string;
  toolName: string;
  arguments: Record<string, unknown>;
}

/**
 * Relay a task to an external MCP server.
 * In V1, this provides the structure — actual MCP client connection
 * will be implemented when we add the MCP client SDK.
 */
export async function relayToMcpServer(
  options: McpRelayOptions
): Promise<TaskResult> {
  const startTime = Date.now();

  // TODO: Implement actual MCP client connection
  // This would use @modelcontextprotocol/sdk client to connect
  // to external MCP servers (GitHub, Slack, databases, etc.)

  return {
    success: false,
    output: `MCP relay to ${options.serverName}/${options.toolName} — client connection not yet implemented`,
    artifacts: [],
    duration: Date.now() - startTime,
    error: "MCP client relay requires Phase 4 implementation",
  };
}

/**
 * Discover available external MCP servers from configuration.
 */
export function listConfiguredMcpServers(): {
  name: string;
  transport: string;
  status: string;
}[] {
  // TODO: Read from cerebro config or claude_desktop_config.json
  return [];
}
