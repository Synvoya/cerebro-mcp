// Copyright (c) 2026 Synvoya. Apache-2.0 License.

import type { AgentCard } from "../types/index.js";

const discoveredAgents = new Map<string, AgentCard>();

/**
 * Discover an external A2A agent by fetching its Agent Card.
 * Agent Cards are published at /.well-known/agent-card.json
 */
export async function discoverAgent(
  baseUrl: string
): Promise<AgentCard | null> {
  const cardUrl = baseUrl.endsWith("/")
    ? `${baseUrl}.well-known/agent-card.json`
    : `${baseUrl}/.well-known/agent-card.json`;

  try {
    const response = await fetch(cardUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error(`Agent Card fetch failed: ${response.status} from ${cardUrl}`);
      return null;
    }

    const card = (await response.json()) as AgentCard;

    if (!card.name || !card.endpoint) {
      console.error(`Invalid Agent Card from ${cardUrl}: missing name or endpoint`);
      return null;
    }

    discoveredAgents.set(card.endpoint, card);
    return card;
  } catch (err) {
    console.error(`Agent discovery failed for ${baseUrl}: ${err}`);
    return null;
  }
}

/**
 * Get all previously discovered external agents.
 */
export function getDiscoveredAgents(): AgentCard[] {
  return Array.from(discoveredAgents.values());
}

/**
 * Check if an agent has already been discovered.
 */
export function isAgentDiscovered(endpoint: string): boolean {
  return discoveredAgents.has(endpoint);
}

/**
 * Remove a discovered agent.
 */
export function forgetAgent(endpoint: string): boolean {
  return discoveredAgents.delete(endpoint);
}

/**
 * Discover multiple agents from a list of URLs.
 */
export async function discoverMultiple(
  urls: string[]
): Promise<{ discovered: AgentCard[]; failed: string[] }> {
  const discovered: AgentCard[] = [];
  const failed: string[] = [];

  const results = await Promise.allSettled(
    urls.map((url) => discoverAgent(url))
  );

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled" && result.value) {
      discovered.push(result.value);
    } else {
      failed.push(urls[i]);
    }
  }

  return { discovered, failed };
}
