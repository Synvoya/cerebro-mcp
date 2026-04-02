// Copyright (c) 2026 Synvoya. Apache-2.0 License.

import { describe, it, expect, beforeEach } from "vitest";
import {
  trackMessage,
  getContextHealth,
  shouldWarn,
  resetTracking,
  getMessageCount,
} from "../src/handover/context-monitor.js";

describe("Context Monitor", () => {
  beforeEach(() => {
    resetTracking();
  });

  it("starts with no usage", () => {
    const health = getContextHealth();
    expect(health.estimatedUsage).toBe(0);
    expect(health.estimatedRemaining).toBe(100);
    expect(health.warningLevel).toBe("none");
  });

  it("tracks message consumption", () => {
    trackMessage(1000, 2000);
    const health = getContextHealth();
    expect(health.estimatedUsage).toBeGreaterThan(0);
    expect(health.estimatedRemaining).toBeLessThan(100);
  });

  it("counts messages", () => {
    trackMessage(100, 200);
    trackMessage(100, 200);
    expect(getMessageCount()).toBe(2);
  });

  it("warns at caution threshold", () => {
    // Simulate heavy usage (60% of ~200k tokens)
    for (let i = 0; i < 40; i++) {
      trackMessage(1500, 1500);
    }
    const health = getContextHealth();
    expect(health.warningLevel).not.toBe("none");
  });

  it("resets tracking", () => {
    trackMessage(5000, 5000);
    resetTracking();
    expect(getMessageCount()).toBe(0);
    expect(getContextHealth().estimatedUsage).toBe(0);
  });

  it("should not warn with low usage", () => {
    trackMessage(100, 100);
    expect(shouldWarn()).toBe(false);
  });
});
