// Copyright (c) 2026 Synvoya. Apache-2.0 License.

import { v4 as uuidv4 } from "uuid";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type {
  AgentDefinition,
  AgentSource,
  CerebroConfig,
  AgentConfigEntry,
} from "../types/index.js";
import { saveAgent, getAgent, deleteAgent } from "../session/store.js";

/**
 * Create a new agent from a natural language description.
 */
export function createAgentFromDescription(
  sessionId: string,
  name: string,
  description: string,
  persona?: string,
  tools?: string[]
): AgentDefinition {
  const agentId = uuidv4();
  const now = new Date().toISOString();

  const agent: AgentDefinition = {
    agentId,
    name,
    description,
    createdAt: now,
    createdBy: "conversation",
    persona: persona || `You are a ${name}. ${description}`,
    tools: tools || [],
    preferences: { learned: {} },
    chainTriggers: { onComplete: null, onError: null },
    source: { tier: "user", skillRef: null },
    a2a: {
      agentCardUrl: `/.well-known/agent-card/${agentId}.json`,
      endpoint: `http://localhost:3000/a2a/${agentId}`,
      supportedModalities: ["text"],
      skills: extractSkills(description),
      taskLifecycle: true,
    },
    version: "1.0.0",
  };

  saveAgent(sessionId, agent);
  return agent;
}

/**
 * Auto-register agents from a .cerebro/agents.json config file.
 */
export function autoRegisterAgents(
  sessionId: string,
  projectPath: string
): AgentDefinition[] {
  const configPath = join(projectPath, ".cerebro", "agents.json");

  if (!existsSync(configPath)) {
    return [];
  }

  try {
    const raw = readFileSync(configPath, "utf-8");
    const config: CerebroConfig = JSON.parse(raw);
    const agents: AgentDefinition[] = [];

    for (const entry of config.agents) {
      const agent = createAgentFromConfig(sessionId, entry, config.defaultChainTriggers);
      agents.push(agent);
    }

    return agents;
  } catch (err) {
    console.error(`Failed to load .cerebro/agents.json: ${err}`);
    return [];
  }
}

function createAgentFromConfig(
  sessionId: string,
  entry: AgentConfigEntry,
  defaultChainTriggers?: { onComplete: string[] | null; onError: string[] | null }
): AgentDefinition {
  const agentId = uuidv4();
  const now = new Date().toISOString();

  const agent: AgentDefinition = {
    agentId,
    name: entry.name,
    description: entry.description,
    createdAt: now,
    createdBy: "conversation",
    persona: entry.persona,
    tools: entry.tools,
    preferences: { learned: {} },
    chainTriggers: entry.chainTriggers || defaultChainTriggers || { onComplete: null, onError: null },
    source: { tier: "user", skillRef: null },
    a2a: {
      agentCardUrl: `/.well-known/agent-card/${agentId}.json`,
      endpoint: `http://localhost:3000/a2a/${agentId}`,
      supportedModalities: ["text"],
      skills: extractSkills(entry.description),
      taskLifecycle: true,
    },
    version: "1.0.0",
  };

  saveAgent(sessionId, agent);
  return agent;
}

/**
 * Update agent preferences based on observed behavior (learning).
 */
export function updateAgentPreference(
  agentId: string,
  sessionId: string,
  key: string,
  value: unknown
): boolean {
  const agent = getAgent(agentId);
  if (!agent) return false;

  agent.preferences.learned[key] = value;
  saveAgent(sessionId, agent);
  return true;
}

/**
 * Remove an agent from the swarm.
 */
export function removeAgent(agentId: string): boolean {
  const agent = getAgent(agentId);
  if (!agent) return false;
  deleteAgent(agentId);
  return true;
}

/**
 * Extract skills from a description for the A2A Agent Card.
 */
function extractSkills(description: string): string[] {
  const skills: string[] = [];
  const lower = description.toLowerCase();

  const skillMap: Record<string, string> = {
    code: "coding",
    programming: "coding",
    design: "design",
    ui: "ui-design",
    ux: "ux-design",
    marketing: "marketing",
    copywriting: "copywriting",
    "social media": "social-media",
    testing: "testing",
    qa: "quality-assurance",
    devops: "devops",
    deploy: "deployment",
    database: "database",
    api: "api-development",
    security: "security",
    documentation: "documentation",
  };

  for (const [keyword, skill] of Object.entries(skillMap)) {
    if (lower.includes(keyword)) {
      skills.push(skill);
    }
  }

  return skills.length > 0 ? skills : ["general"];
}
