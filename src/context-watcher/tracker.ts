// Copyright (c) 2026 Synvoya. Apache-2.0 License.
// Context Watcher — Tracker

export interface ToolCallRecord {
  toolName: string;
  timestamp: string;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  sessionId: string | null;
  durationMs: number;
}

export interface ContextWatcherStats {
  totalToolCalls: number;
  totalEstimatedTokens: number;
  inputTokens: number;
  outputTokens: number;
  percentUsed: number;
  maxContextTokens: number;
  toolCallBreakdown: Record<string, { count: number; tokens: number }>;
  sessionStartedAt: string;
  lastToolCallAt: string | null;
  warningLevel: "green" | "yellow" | "orange" | "red";
  recommendation: string;
  handoverRecommended: boolean;
  estimatedCallsRemaining: number;
}

const TOKEN_ESTIMATES: Record<string, { input: number; output: number }> = {
  create_session: { input: 200, output: 300 },
  resume_session: { input: 400, output: 300 },
  pause_session: { input: 100, output: 100 },
  end_session: { input: 100, output: 150 },
  list_sessions: { input: 100, output: 500 },
  execute_task: { input: 500, output: 3000 },
  quick_task: { input: 500, output: 3000 },
  read_project: { input: 300, output: 5000 },
  get_status: { input: 100, output: 400 },
  review_code: { input: 300, output: 5000 },
  run_build: { input: 200, output: 5000 },
  run_tests: { input: 200, output: 5000 },
  create_agent: { input: 400, output: 300 },
  list_agents: { input: 100, output: 600 },
  update_agent: { input: 300, output: 200 },
  remove_agent: { input: 100, output: 100 },
  get_agent_status: { input: 100, output: 800 },
  install_agent_pack: { input: 200, output: 500 },
  delegate_to_agent: { input: 500, output: 3000 },
  analyze_image: { input: 500, output: 600 },
  implement_from_image: { input: 600, output: 5000 },
  compare_screenshots: { input: 600, output: 500 },
  prepare_handover: { input: 100, output: 800 },
  validate_token: { input: 300, output: 200 },
  get_context_health: { input: 100, output: 400 },
  configure_workers: { input: 300, output: 400 },
  detect_providers: { input: 100, output: 400 },
  configure_model: { input: 300, output: 400 },
  start_context_watcher: { input: 100, output: 200 },
  stop_context_watcher: { input: 100, output: 200 },
};

const DEFAULT_ESTIMATE = { input: 300, output: 1000 };
const MAX_CONTEXT_TOKENS = 200_000;

let toolCalls: ToolCallRecord[] = [];
let sessionStartedAt: string = new Date().toISOString();
let watcherEnabled = false;
let onUpdateCallback: ((stats: ContextWatcherStats) => void) | null = null;

export function recordToolCall(toolName: string, sessionId: string | null, durationMs: number): void {
  const estimate = TOKEN_ESTIMATES[toolName] || DEFAULT_ESTIMATE;
  toolCalls.push({ toolName, timestamp: new Date().toISOString(), estimatedInputTokens: estimate.input, estimatedOutputTokens: estimate.output, sessionId, durationMs });
  if (watcherEnabled && onUpdateCallback) onUpdateCallback(getStats());
}

export function getStats(): ContextWatcherStats {
  const breakdown: Record<string, { count: number; tokens: number }> = {};
  let inputTokens = 0, outputTokens = 0;
  for (const call of toolCalls) {
    inputTokens += call.estimatedInputTokens;
    outputTokens += call.estimatedOutputTokens;
    if (!breakdown[call.toolName]) breakdown[call.toolName] = { count: 0, tokens: 0 };
    breakdown[call.toolName].count++;
    breakdown[call.toolName].tokens += call.estimatedInputTokens + call.estimatedOutputTokens;
  }
  const total = inputTokens + outputTokens + 15000 + toolCalls.length * 1500;
  const percentUsed = Math.min(Math.round((total / MAX_CONTEXT_TOKENS) * 100), 100);
  let warningLevel: ContextWatcherStats["warningLevel"] = "green";
  let recommendation = "Context healthy — keep building";
  let handoverRecommended = false;
  if (percentUsed >= 85) { warningLevel = "red"; recommendation = "HANDOVER NOW — context nearly full. Run prepare_handover."; handoverRecommended = true; }
  else if (percentUsed >= 70) { warningLevel = "orange"; recommendation = "Context getting heavy — prepare handover soon"; }
  else if (percentUsed >= 50) { warningLevel = "yellow"; recommendation = "Halfway through context — working normally"; }
  const avg = toolCalls.length > 0 ? total / toolCalls.length : 2500;
  return { totalToolCalls: toolCalls.length, totalEstimatedTokens: total, inputTokens, outputTokens, percentUsed, maxContextTokens: MAX_CONTEXT_TOKENS, toolCallBreakdown: breakdown, sessionStartedAt, lastToolCallAt: toolCalls.length > 0 ? toolCalls[toolCalls.length - 1].timestamp : null, warningLevel, recommendation, handoverRecommended, estimatedCallsRemaining: Math.max(0, Math.floor((MAX_CONTEXT_TOKENS - total) / avg)) };
}

export function resetTracker(): void { toolCalls = []; sessionStartedAt = new Date().toISOString(); }
export function setWatcherEnabled(enabled: boolean): void { watcherEnabled = enabled; }
export function isWatcherEnabled(): boolean { return watcherEnabled; }
export function onUpdate(callback: ((stats: ContextWatcherStats) => void) | null): void { onUpdateCallback = callback; }
export function getToolCallHistory(): ToolCallRecord[] { return [...toolCalls]; }
