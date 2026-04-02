// Copyright (c) 2026 Synvoya. Apache-2.0 License.

import type { AgentDefinition, AgentCard } from "../types/index.js";

/**
 * Generate an A2A Agent Card from a Cerebro agent definition.
 * Agent Cards are published at /.well-known/agent-card.json
 * and enable discovery by other A2A-compliant systems.
 */
export function generateAgentCard(agent: AgentDefinition): AgentCard {
  return {
    name: agent.name,
    description: agent.description,
    version: agent.version,
    endpoint: agent.a2a.endpoint,
    capabilities: {
      modalities: agent.a2a.supportedModalities,
      skills: agent.a2a.skills,
      taskLifecycle: agent.a2a.taskLifecycle,
    },
    authentication: {
      type: "none",
      required: false,
    },
  };
}

/**
 * Generate Agent Cards for all agents in a session.
 */
export function generateAllAgentCards(
  agents: AgentDefinition[]
): Map<string, AgentCard> {
  const cards = new Map<string, AgentCard>();
  for (const agent of agents) {
    cards.set(agent.agentId, generateAgentCard(agent));
  }
  return cards;
}

/**
 * Serialize an Agent Card to JSON for publishing.
 */
export function serializeAgentCard(card: AgentCard): string {
  return JSON.stringify(card, null, 2);
}
