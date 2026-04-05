// Copyright (c) 2026 Synvoya. Apache-2.0 License.

import { describe, it, expect } from "vitest";
import {
  getContextHealth,
  shouldWarn,
} from "../src/handover/context-monitor.js";
import type { Session } from "../src/types/index.js";

function makeSession(completedCount: number, pendingCount = 0): Session {
  const completedTasks = Array.from({ length: completedCount }, (_, i) => ({
    id: `task-${i}`,
    description: `Task ${i}`,
    state: "completed" as const,
    assignedTo: null,
    agentId: null,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    result: null,
    threadId: null,
    parentTaskId: null,
  }));
  const taskQueue = Array.from({ length: pendingCount }, (_, i) => ({
    id: `pending-${i}`,
    description: `Pending ${i}`,
    state: "pending" as const,
    assignedTo: null,
    agentId: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
    result: null,
    threadId: null,
    parentTaskId: null,
  }));
  return {
    id: "test-session",
    state: "active",
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
    projectHash: "abc123",
    projectPath: "/tmp/test",
    taskQueue,
    completedTasks,
    fileManifest: [],
    agents: [],
    metadata: {},
  };
}

describe("Context Monitor", () => {
  it("starts with no usage for empty session", () => {
    const health = getContextHealth(makeSession(0));
    expect(health.messagesInSession).toBe(0);
    expect(health.estimatedTokensUsed).toBe(0);
    expect(health.estimatedTokensRemaining).toBe(200000);
    expect(health.percentUsed).toBe(0);
    expect(health.recommendation).toBe("Context healthy");
    expect(health.warningLevel).toBe("none");
  });

  it("tracks completed tasks as token consumption", () => {
    const health = getContextHealth(makeSession(10));
    expect(health.messagesInSession).toBe(10);
    expect(health.estimatedTokensUsed).toBe(20000);
    expect(health.estimatedTokensRemaining).toBe(180000);
    expect(health.percentUsed).toBe(10);
  });

  it("includes pending tasks in message count", () => {
    const health = getContextHealth(makeSession(5, 3));
    expect(health.messagesInSession).toBe(8);
    // Only completed tasks count toward token usage
    expect(health.estimatedTokensUsed).toBe(10000);
  });

  it("warns at 60% threshold (caution)", () => {
    // 60 completed tasks * 2000 = 120,000 / 200,000 = 60%
    const health = getContextHealth(makeSession(60));
    expect(health.warningLevel).toBe("caution");
    expect(health.recommendation).toBe("Consider handover soon");
    expect(health.handoverReady).toBe(true);
    expect(health.shouldHandover).toBe(false);
  });

  it("warns at 80% threshold (critical)", () => {
    // 80 completed tasks * 2000 = 160,000 / 200,000 = 80%
    const health = getContextHealth(makeSession(80));
    expect(health.warningLevel).toBe("critical");
    expect(health.recommendation).toBe("Context nearly full — prepare handover");
    expect(health.shouldHandover).toBe(true);
  });

  it("should not warn with low usage", () => {
    expect(shouldWarn(makeSession(5))).toBe(false);
  });
});
