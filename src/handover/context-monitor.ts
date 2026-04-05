// Copyright (c) 2026 Synvoya. Apache-2.0 License.

import type { ContextHealth, Session } from "../types/index.js";

const TOKENS_PER_TASK = 2000;
const MAX_TOKENS = 200000;

/**
 * Get current context health status based on actual session usage.
 * Uses completedTasks count as a proxy: each task ≈ 2000 tokens.
 */
export function getContextHealth(session: Session): ContextHealth {
  const messagesInSession = session.completedTasks.length + session.taskQueue.length;
  const estimatedTokensUsed = session.completedTasks.length * TOKENS_PER_TASK;
  const estimatedTokensRemaining = Math.max(0, MAX_TOKENS - estimatedTokensUsed);
  const percentUsed = Math.min(Math.round((estimatedTokensUsed / MAX_TOKENS) * 100), 100);

  let warningLevel: ContextHealth["warningLevel"] = "none";
  let recommendation = "Context healthy";
  let shouldHandover = false;
  let handoverReady = false;

  if (percentUsed >= 80) {
    warningLevel = "critical";
    recommendation = "Context nearly full — prepare handover";
    shouldHandover = true;
    handoverReady = true;
  } else if (percentUsed >= 60) {
    warningLevel = "caution";
    recommendation = "Consider handover soon";
    handoverReady = true;
  }

  return {
    messagesInSession,
    estimatedTokensUsed,
    estimatedTokensRemaining,
    percentUsed,
    recommendation,
    warningLevel,
    shouldHandover,
    handoverReady,
  };
}

/**
 * Check if we should warn the user about context limits.
 */
export function shouldWarn(session: Session): boolean {
  const health = getContextHealth(session);
  return health.warningLevel !== "none";
}
