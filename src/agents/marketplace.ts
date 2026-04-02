// Copyright (c) 2026 Synvoya. Apache-2.0 License.

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentDefinition, AgentConfigEntry } from "../types/index.js";
import { createAgentFromDescription } from "./swarm-manager.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const AGENTS_DIR = join(__dirname, "..", "..", "agents");
const STARTER_KITS_DIR = join(__dirname, "..", "..", "starter-kits");

/**
 * List available built-in agent templates (Tier 1: Anthropic Skills).
 */
export function listBuiltinAgents(): AgentConfigEntry[] {
  if (!existsSync(AGENTS_DIR)) return [];

  try {
    const files = readdirSync(AGENTS_DIR).filter((f) => f.endsWith(".json"));
    return files.map((f) => {
      const raw = readFileSync(join(AGENTS_DIR, f), "utf-8");
      return JSON.parse(raw) as AgentConfigEntry;
    });
  } catch {
    return [];
  }
}

/**
 * Install a built-in agent template into a session.
 */
export function installBuiltinAgent(
  sessionId: string,
  agentName: string
): AgentDefinition | null {
  const templates = listBuiltinAgents();
  const template = templates.find(
    (t) => t.name.toLowerCase() === agentName.toLowerCase()
  );

  if (!template) return null;

  return createAgentFromDescription(
    sessionId,
    template.name,
    template.description,
    template.persona,
    template.tools
  );
}

/**
 * List available starter kits.
 */
export function listStarterKits(): string[] {
  if (!existsSync(STARTER_KITS_DIR)) return [];

  try {
    return readdirSync(STARTER_KITS_DIR).filter((d) =>
      existsSync(join(STARTER_KITS_DIR, d, "agents.json"))
    );
  } catch {
    return [];
  }
}

/**
 * Install a starter kit — creates all agents defined in the kit.
 */
export function installStarterKit(
  sessionId: string,
  kitName: string
): AgentDefinition[] {
  const kitPath = join(STARTER_KITS_DIR, kitName, "agents.json");

  if (!existsSync(kitPath)) return [];

  try {
    const raw = readFileSync(kitPath, "utf-8");
    const config = JSON.parse(raw) as { agents: AgentConfigEntry[] };

    return config.agents.map((entry) =>
      createAgentFromDescription(
        sessionId,
        entry.name,
        entry.description,
        entry.persona,
        entry.tools
      )
    );
  } catch {
    return [];
  }
}
