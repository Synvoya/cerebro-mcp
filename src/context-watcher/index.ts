// Copyright (c) 2026 Synvoya. Apache-2.0 License.
// Context Watcher — Barrel Export

export {
  recordToolCall,
  getStats,
  resetTracker,
  setWatcherEnabled,
  isWatcherEnabled,
  onUpdate,
  getToolCallHistory,
} from "./tracker.js";

export type { ToolCallRecord, ContextWatcherStats } from "./tracker.js";

export {
  writeStateFile,
  isTerminalRunning,
  openTerminal,
  closeTerminal,
} from "./terminal.js";
