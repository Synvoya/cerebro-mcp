// Copyright (c) 2026 Synvoya. Apache-2.0 License.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { AgentDefinition, CerebroConfig } from "../types/index.js";
import { createAgentFromDescription } from "./swarm-manager.js";

/**
 * Auto-register agents from .cerebro/agents.json in a project directory.
 * Called on session creation if the config file exists.
 */
export function autoRegister(
  sessionId: string,
  projectPath: string
): { agents: AgentDefinition[]; configFound: boolean } {
  const configPath = join(projectPath, ".cerebro", "agents.json");

  if (!existsSync(configPath)) {
    return { agents: [], configFound: false };
  }

  try {
    const raw = readFileSync(configPath, "utf-8");
    const config: CerebroConfig = JSON.parse(raw);

    const agents = config.agents.map((entry) =>
      createAgentFromDescription(
        sessionId,
        entry.name,
        entry.description,
        entry.persona,
        entry.tools
      )
    );

    return { agents, configFound: true };
  } catch (err) {
    console.error(`Failed to auto-register agents: ${err}`);
    return { agents: [], configFound: false };
  }
}
