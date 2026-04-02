// Copyright (c) 2026 Synvoya. Apache-2.0 License.

import type { DecomposedStep, ImageAnalysis } from "../types/index.js";

/**
 * Parse vision analysis output into structured instructions.
 * The LLM provides natural language analysis — this converts
 * it into decomposed steps for the task router.
 */
export function parseVisionToInstructions(
  visionOutput: string
): ImageAnalysis {
  const suggestedActions = extractActions(visionOutput);
  const instructions = actionsToSteps(suggestedActions);

  return {
    description: visionOutput.slice(0, 500),
    suggestedActions,
    structuredInstructions: instructions,
    confidence: suggestedActions.length > 0 ? 0.7 : 0.3,
  };
}

/**
 * Extract actionable items from vision output text.
 */
function extractActions(text: string): string[] {
  const actions: string[] = [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    // Lines starting with action words
    if (
      /^(fix|change|update|add|remove|move|resize|adjust|replace|create|implement)/i.test(
        line
      )
    ) {
      actions.push(line);
    }

    // Numbered or bulleted items that are actionable
    if (/^[\d\-\*•]\s*.*(should|need|must|could|fix|change)/i.test(line)) {
      actions.push(line.replace(/^[\d\-\*•\.]\s*/, ""));
    }
  }

  return actions.length > 0
    ? actions
    : ["Review image and determine appropriate action"];
}

/**
 * Convert extracted actions into decomposed steps.
 */
function actionsToSteps(actions: string[]): DecomposedStep[] {
  return actions.map((action, i) => ({
    order: i + 1,
    description: action,
    target: "cli" as const,
    agentId: null,
    dependsOn: i > 0 ? [i] : [],
  }));
}
