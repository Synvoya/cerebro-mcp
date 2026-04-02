// Copyright (c) 2026 Synvoya. Apache-2.0 License.

import { describe, it, expect } from "vitest";
import {
  isValidTransition,
  getAllowedTransitions,
  isTerminalState,
  describeState,
} from "../src/a2a/task-lifecycle.js";

describe("A2A Task Lifecycle", () => {
  it("allows valid transitions", () => {
    expect(isValidTransition("submitted", "working")).toBe(true);
    expect(isValidTransition("working", "completed")).toBe(true);
    expect(isValidTransition("working", "failed")).toBe(true);
    expect(isValidTransition("working", "input-needed")).toBe(true);
    expect(isValidTransition("input-needed", "working")).toBe(true);
  });

  it("rejects invalid transitions", () => {
    expect(isValidTransition("completed", "working")).toBe(false);
    expect(isValidTransition("failed", "completed")).toBe(false);
    expect(isValidTransition("submitted", "completed")).toBe(false);
  });

  it("identifies terminal states", () => {
    expect(isTerminalState("completed")).toBe(true);
    expect(isTerminalState("failed")).toBe(true);
    expect(isTerminalState("cancelled")).toBe(true);
    expect(isTerminalState("working")).toBe(false);
    expect(isTerminalState("submitted")).toBe(false);
  });

  it("lists allowed transitions", () => {
    const fromSubmitted = getAllowedTransitions("submitted");
    expect(fromSubmitted).toContain("working");
    expect(fromSubmitted).toContain("cancelled");
    expect(fromSubmitted).not.toContain("completed");
  });

  it("returns empty transitions for terminal states", () => {
    expect(getAllowedTransitions("completed")).toEqual([]);
    expect(getAllowedTransitions("failed")).toEqual([]);
  });

  it("describes states in human-friendly language", () => {
    expect(describeState("working")).toContain("actively working");
    expect(describeState("completed")).toContain("finished");
    expect(describeState("input-needed")).toContain("additional input");
  });
});
