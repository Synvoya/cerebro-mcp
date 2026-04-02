// Copyright (c) 2026 Synvoya. Apache-2.0 License.

import type { ContextHealth } from "../types/index.js";

let messageCount = 0;
let estimatedTokens = 0;
const MAX_TOKENS_ESTIMATE = 200000; // Conservative estimate for context window

/**
 * Track context consumption from a message exchange.
 */
export function trackMessage(inputTokens: number, outputTokens: number): void {
  messageCount++;
  estimatedTokens += inputTokens + outputTokens;
}

/**
 * Get current context health status.
 */
export function getContextHealth(): ContextHealth {
  const usage = Math.min(estimatedTokens / MAX_TOKENS_ESTIMATE, 1.0);
  const remaining = 1.0 - usage;

  let warningLevel: ContextHealth["warningLevel"] = "none";
  if (remaining <= 0.2) {
    warningLevel = "critical";
  } else if (remaining <= 0.4) {
    warningLevel = "caution";
  }

  return {
    estimatedUsage: Math.round(usage * 100),
    estimatedRemaining: Math.round(remaining * 100),
    warningLevel,
    shouldHandover: remaining <= 0.2,
    handoverReady: remaining <= 0.4,
  };
}

/**
 * Check if we should warn the user about context limits.
 */
export function shouldWarn(): boolean {
  const health = getContextHealth();
  return health.warningLevel !== "none";
}

/**
 * Reset tracking (for new session or after handover).
 */
export function resetTracking(): void {
  messageCount = 0;
  estimatedTokens = 0;
}

/**
 * Get message count for the current session.
 */
export function getMessageCount(): number {
  return messageCount;
}
