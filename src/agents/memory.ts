// Copyright (c) 2026 Synvoya. Apache-2.0 License.

import type { AgentDefinition } from "../types/index.js";
import { getAgent, saveAgent } from "../session/store.js";

/**
 * Learn a preference from task completion.
 * Preferences persist across sessions, working context doesn't.
 */
export function learnPreference(
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
 * Get all learned preferences for an agent.
 */
export function getLearnedPreferences(
  agentId: string
): Record<string, unknown> {
  const agent = getAgent(agentId);
  if (!agent) return {};
  return agent.preferences.learned;
}

/**
 * Clear a specific learned preference.
 */
export function clearPreference(
  agentId: string,
  sessionId: string,
  key: string
): boolean {
  const agent = getAgent(agentId);
  if (!agent) return false;

  delete agent.preferences.learned[key];
  saveAgent(sessionId, agent);
  return true;
}

/**
 * Extract learnable preferences from task output.
 * This is a heuristic — the LLM would do more sophisticated extraction.
 */
export function extractPreferences(
  taskDescription: string,
  output: string
): Record<string, string> {
  const prefs: Record<string, string> = {};
  const lower = taskDescription.toLowerCase() + " " + output.toLowerCase();

  // Framework preferences
  if (lower.includes("react")) prefs.framework = "React";
  else if (lower.includes("vue")) prefs.framework = "Vue";
  else if (lower.includes("svelte")) prefs.framework = "Svelte";
  else if (lower.includes("angular")) prefs.framework = "Angular";

  // Language preferences
  if (lower.includes("typescript")) prefs.language = "TypeScript";
  else if (lower.includes("python")) prefs.language = "Python";
  else if (lower.includes("rust")) prefs.language = "Rust";

  // Style preferences
  if (lower.includes("tailwind")) prefs.styling = "Tailwind CSS";
  else if (lower.includes("styled-components")) prefs.styling = "styled-components";

  // Testing preferences
  if (lower.includes("vitest")) prefs.testRunner = "Vitest";
  else if (lower.includes("jest")) prefs.testRunner = "Jest";
  else if (lower.includes("pytest")) prefs.testRunner = "pytest";

  return prefs;
}
