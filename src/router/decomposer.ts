// Copyright (c) 2026 Synvoya. Apache-2.0 License.

import type { DecomposedStep } from "../types/index.js";

interface DecomposeOptions {
  agentNames: string[];
  hasVision: boolean;
}

/**
 * Decompose a high-level task description into ordered executable steps.
 * This is a heuristic decomposer — in production, the LLM (Chat brain)
 * does the actual decomposition. This provides structure for the result.
 */
export function decomposeTask(
  description: string,
  options: DecomposeOptions
): DecomposedStep[] {
  const lower = description.toLowerCase();
  const steps: DecomposedStep[] = [];
  let order = 1;

  // If it mentions an image/screenshot and we have vision
  if (
    options.hasVision &&
    (lower.includes("screenshot") ||
      lower.includes("image") ||
      lower.includes("mockup") ||
      lower.includes("photo"))
  ) {
    steps.push({
      order: order++,
      description: "Analyze image to extract requirements or identify issues",
      target: "cli",
      agentId: null,
      dependsOn: [],
    });
  }

  // Main implementation step
  steps.push({
    order: order++,
    description: description,
    target: "cli",
    agentId: null,
    dependsOn: steps.length > 0 ? [steps[steps.length - 1].order] : [],
  });

  // If it sounds like it needs testing
  if (
    lower.includes("build") ||
    lower.includes("create") ||
    lower.includes("implement") ||
    lower.includes("fix")
  ) {
    steps.push({
      order: order++,
      description: "Run tests to verify implementation",
      target: "cli",
      agentId: null,
      dependsOn: [order - 2],
    });
  }

  // If it mentions deploy
  if (lower.includes("deploy") || lower.includes("launch") || lower.includes("publish")) {
    steps.push({
      order: order++,
      description: "Deploy to target environment",
      target: "cli",
      agentId: null,
      dependsOn: [order - 2],
    });
  }

  return steps;
}

/**
 * Check if all dependencies for a step are completed.
 */
export function areDependenciesMet(
  step: DecomposedStep,
  completedSteps: number[]
): boolean {
  return step.dependsOn.every((dep) => completedSteps.includes(dep));
}

/**
 * Get the next executable steps (all dependencies met).
 */
export function getNextSteps(
  steps: DecomposedStep[],
  completedSteps: number[]
): DecomposedStep[] {
  return steps.filter(
    (s) =>
      !completedSteps.includes(s.order) && areDependenciesMet(s, completedSteps)
  );
}
