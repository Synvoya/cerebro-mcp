// Copyright (c) 2026 Synvoya. Apache-2.0 License.

import { describe, it, expect } from "vitest";
import { routeTask } from "../src/router/task-router.js";
import type { AgentDefinition } from "../src/types/index.js";

const mockAgent = (name: string, desc: string, skills: string[] = []): AgentDefinition => ({
  agentId: `agent-${name.toLowerCase()}`,
  name,
  description: desc,
  createdAt: new Date().toISOString(),
  createdBy: "conversation",
  persona: `You are a ${name}`,
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

describe("Task Router", () => {
  it("routes code tasks to CLI when no agents", () => {
    const result = routeTask("Build a React landing page", []);
    expect(result.target).toBe("cli");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("routes to matching agent by name", () => {
    const agents = [mockAgent("Marketing", "Writes social media copy", ["copywriting"])];
    const result = routeTask("Ask Marketing to write a tweet", agents);
    expect(result.target).toBe("agent");
    expect(result.agentId).toBe("agent-marketing");
  });

  it("routes to matching agent by skill", () => {
    const agents = [mockAgent("Designer", "Creates UI designs", ["ui-design"])];
    const result = routeTask("Ask Designer to create a homepage layout", agents);
    expect(result.target).toBe("agent");
  });

  it("falls back to CLI when no agent matches", () => {
    const agents = [mockAgent("Marketing", "Writes copy")];
    const result = routeTask("Fix the database migration", agents);
    expect(result.target).toBe("cli");
  });

  it("includes confidence score", () => {
    const result = routeTask("Build a React app", []);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });

  it("includes reasoning", () => {
    const result = routeTask("Deploy to production", []);
    expect(result.reasoning).toBeTruthy();
    expect(typeof result.reasoning).toBe("string");
  });
});
