// Copyright (c) 2026 Synvoya. Apache-2.0 License.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createAgentFromDescription, removeAgent } from "../src/agents/swarm-manager.js";
import { createNewSession } from "../src/session/manager.js";
import { closeDb } from "../src/session/store.js";

let sessionId: string;

beforeAll(() => {
  const session = createNewSession("/tmp/swarm-test");
  sessionId = session.id;
});

afterAll(() => {
  closeDb();
});

describe("Swarm Manager", () => {
  it("creates an agent from description", () => {
    const agent = createAgentFromDescription(
      sessionId,
      "TestBot",
      "A test agent for unit testing",
      "You are a test bot."
    );

    expect(agent.agentId).toBeTruthy();
    expect(agent.name).toBe("TestBot");
    expect(agent.description).toBe("A test agent for unit testing");
    expect(agent.createdBy).toBe("conversation");
    expect(agent.a2a.taskLifecycle).toBe(true);
  });

  it("auto-extracts skills from description", () => {
    const agent = createAgentFromDescription(
      sessionId,
      "DevAgent",
      "A coding and testing agent for API development"
    );

    expect(agent.a2a.skills.length).toBeGreaterThan(0);
    expect(agent.a2a.skills).toContain("testing");
    expect(agent.a2a.skills).toContain("api-development");
  });

  it("generates A2A config automatically", () => {
    const agent = createAgentFromDescription(sessionId, "Bot", "Test");

    expect(agent.a2a.agentCardUrl).toContain(agent.agentId);
    expect(agent.a2a.endpoint).toContain(agent.agentId);
    expect(agent.a2a.supportedModalities).toContain("text");
  });

  it("removes an agent", () => {
    const agent = createAgentFromDescription(sessionId, "TempBot", "Temporary");
    const removed = removeAgent(agent.agentId);
    expect(removed).toBe(true);
  });

  it("returns false when removing non-existent agent", () => {
    const removed = removeAgent("non-existent");
    expect(removed).toBe(false);
  });
});
