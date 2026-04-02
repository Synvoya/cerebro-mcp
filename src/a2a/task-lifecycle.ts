// Copyright (c) 2026 Synvoya. Apache-2.0 License.

import type { TaskState } from "../types/index.js";

/**
 * Valid A2A task state transitions.
 * Enforces the A2A protocol's task lifecycle.
 */
const VALID_TRANSITIONS: Record<TaskState, TaskState[]> = {
  pending: ["submitted"],
  submitted: ["working", "cancelled"],
  working: ["completed", "failed", "input-needed", "cancelled"],
  "input-needed": ["working", "cancelled"],
  completed: [],
  failed: [],
  cancelled: [],
};

/**
 * Check if a state transition is valid per A2A protocol.
 */
export function isValidTransition(from: TaskState, to: TaskState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get allowed next states from current state.
 */
export function getAllowedTransitions(current: TaskState): TaskState[] {
  return VALID_TRANSITIONS[current] || [];
}

/**
 * Check if a task is in a terminal state (no more transitions).
 */
export function isTerminalState(state: TaskState): boolean {
  return (
    state === "completed" || state === "failed" || state === "cancelled"
  );
}

/**
 * Get a human-friendly description of a task state.
 */
export function describeState(state: TaskState): string {
  const descriptions: Record<TaskState, string> = {
    pending: "Waiting to be submitted",
    submitted: "Task received, queued for processing",
    working: "Agent is actively working on this task",
    "input-needed": "Agent needs additional input to continue",
    completed: "Task finished successfully",
    failed: "Task encountered an error",
    cancelled: "Task was cancelled",
  };
  return descriptions[state] || state;
}
