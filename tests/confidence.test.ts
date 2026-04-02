// Copyright (c) 2026 Synvoya. Apache-2.0 License.

import { describe, it, expect } from "vitest";
import { rankAgents, findBestAgent } from "../src/agents/confidence.js";
import type { AgentDefinition } from "../src/types/index.js";

const makeAgent = (name: string, desc: string, skills: string[] = []): AgentDefinition => ({
  agentId: `agent-${name.toLowerCase()}`,
  name,
  description: desc,
  createdAt: new Date().toISOString(),
  createdBy: "conversation",
  persona: `You are a ${name}. ${desc}`,
  tools: [],
  preferences: { learned: {} },
  chainTriggers: { onComplete: null, onError: null },
  source: { tier: "user", skillRef: null },
  a2a: {
    agentCardUrl: "", endpoint: "", supportedModalities: ["text"],
    skills, taskLifecycle: true,
  },
  version: "1.0.0",
});

describe("Confidence Scoring", () => {
  const agents = [
    makeAgent("Coder", "Writes code and builds software", ["coding"]),
    makeAgent("Designer", "Creates UI designs and mockups", ["ui-design"]),
    makeAgent("Marketing", "Writes social media copy and campaigns", ["copywriting", "social-media"]),
  ];

  it("ranks agents by relevance", () => {
    const results = rankAgents("Write some marketing copy for Twitter", agents);
    expect(results.length).toBe(3);
    expect(results[0].agentName).toBe("Marketing");
  });

  it("finds best agent above threshold", () => {
    const best = findBestAgent("Ask the Designer to create mockups", agents, 0.2);
    expect(best).not.toBeNull();
    expect(best!.agentName).toBe("Designer");
  });

  it("returns null when no agent matches threshold", () => {
    const best = findBestAgent("Order pizza for the team", agents, 0.8);
    expect(best).toBeNull();
  });

  it("scores name mentions highly", () => {
    const results = rankAgents("Ask the Coder to fix the bug", agents);
    expect(results[0].agentName).toBe("Coder");
    expect(results[0].score).toBeGreaterThan(0.3);
  });

  it("includes reasoning in results", () => {
    const results = rankAgents("Build a React component", agents);
    expect(results[0].reasoning).toBeTruthy();
  });

  it("handles empty agent list", () => {
    const results = rankAgents("Do something", []);
    expect(results).toEqual([]);
  });
});
