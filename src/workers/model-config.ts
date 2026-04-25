// Copyright (c) 2026 Synvoya. Apache-2.0 License.
// Model & Effort Configuration — three layers:
// 1. Session defaults: "Set Opus as default model"
// 2. Per-agent defaults: "The Coder agent should use Opus"
// 3. Per-task override: "Run this with Sonnet on low effort"

interface ProviderConfig {
  model?: string;
  effort?: string;
}

interface AgentConfig {
  model?: string;
  effort?: string;
}

const config = {
  defaultModel: null as string | null,         // null = use CLI's own default
  defaultEffort: "medium" as string,
  defaultSpawnMode: "visible" as "visible" | "background",
  defaultExecutionMode: "interactive" as "interactive" | "quiet",
  perProvider: {} as Record<string, ProviderConfig>,
  perAgent: {} as Record<string, AgentConfig>,
  autoCloseTerminal: false,
  watcherAutoStart: false,
};

// ─── Session Defaults ────────────────────────────────────────────
export function setDefaultModel(model: string | null): void {
  config.defaultModel = model;
}
export function setDefaultEffort(effort: string): void {
  config.defaultEffort = effort;
}
export function setDefaultSpawnMode(mode: "visible" | "background"): void {
  config.defaultSpawnMode = mode;
}
export function setDefaultExecutionMode(mode: "interactive" | "quiet"): void {
  config.defaultExecutionMode = mode;
}

// ─── Per-Provider Config ─────────────────────────────────────────
export function setProviderModel(provider: string, model: string): void {
  if (!config.perProvider[provider]) config.perProvider[provider] = {};
  config.perProvider[provider].model = model;
}
export function setProviderEffort(provider: string, effort: string): void {
  if (!config.perProvider[provider]) config.perProvider[provider] = {};
  config.perProvider[provider].effort = effort;
}

// ─── Per-Agent Config ────────────────────────────────────────────
export function setAgentModel(agentId: string, model: string): void {
  if (!config.perAgent[agentId]) config.perAgent[agentId] = {};
  config.perAgent[agentId].model = model;
}
export function setAgentEffort(agentId: string, effort: string): void {
  if (!config.perAgent[agentId]) config.perAgent[agentId] = {};
  config.perAgent[agentId].effort = effort;
}

// ─── Resolution (per-task > per-agent > per-provider > default) ──
export function resolveModel(
  provider?: string, agentId?: string, taskOverride?: string,
): string | undefined {
  if (taskOverride) return taskOverride;
  if (agentId && config.perAgent[agentId]?.model) return config.perAgent[agentId].model;
  if (provider && config.perProvider[provider]?.model) return config.perProvider[provider].model;
  return config.defaultModel || undefined;
}

export function resolveEffort(
  provider?: string, agentId?: string, taskOverride?: string,
): string {
  if (taskOverride) return taskOverride;
  if (agentId && config.perAgent[agentId]?.effort) return config.perAgent[agentId].effort;
  if (provider && config.perProvider[provider]?.effort) return config.perProvider[provider].effort;
  return config.defaultEffort;
}

export function resolveSpawnMode(): "visible" | "background" {
  return config.defaultSpawnMode;
}

export function resolveExecutionMode(): "interactive" | "quiet" {
  return config.defaultExecutionMode;
}

// ─── Auto-Close Terminal ────────────────────────────────────────
export function setAutoCloseTerminal(enabled: boolean): void {
  config.autoCloseTerminal = enabled;
}
export function getAutoCloseTerminal(): boolean {
  return config.autoCloseTerminal;
}

// ─── Watcher Auto-Start ─────────────────────────────────────────
export function setWatcherAutoStart(enabled: boolean): void {
  config.watcherAutoStart = enabled;
}
export function getWatcherAutoStart(): boolean {
  return config.watcherAutoStart;
}

// ─── Get Full Config ─────────────────────────────────────────────
export function getModelConfig() {
  return { ...config };
}

// ─── Natural Language Parser ─────────────────────────────────────
export interface ParsedConfig {
  model?: string;
  effort?: string;
  spawnMode?: "visible" | "background";
  executionMode?: "interactive" | "quiet";
  autoCloseTerminal?: boolean;
  watcherAutoStart?: boolean;
  forProvider?: string;
  forAgent?: string;
}

export function parseModelConfig(instruction: string): ParsedConfig {
  const lower = instruction.toLowerCase();
  const result: ParsedConfig = {};

  // Model detection
  const modelPatterns: Record<string, string> = {
    opus: "opus",
    sonnet: "sonnet",
    haiku: "haiku",
    "o4-mini": "o4-mini",
    "o3": "o3",
    "gpt-4": "gpt-4",
    "gpt-4o": "gpt-4o",
    "claude-3.5-sonnet": "claude-3.5-sonnet",
    "claude-4-opus": "claude-4-opus",
    "claude-4-sonnet": "claude-4-sonnet",
  };
  for (const [keyword, model] of Object.entries(modelPatterns)) {
    if (lower.includes(keyword)) {
      result.model = model;
      break;
    }
  }

  // Effort detection
  if (lower.includes("max effort") || lower.includes("maximum effort")) {
    result.effort = "max";
  } else if (lower.includes("high effort")) {
    result.effort = "high";
  } else if (lower.includes("low effort") || lower.includes("quick") || lower.includes("fast")) {
    result.effort = "low";
  } else if (lower.includes("medium effort")) {
    result.effort = "medium";
  }

  // Spawn mode detection (visible terminal vs background)
  if (lower.includes("background") || lower.includes("silent") || lower.includes("hidden") ||
      lower.includes("no terminal") || lower.includes("headless")) {
    result.spawnMode = "background";
  } else if (lower.includes("visible") || lower.includes("show terminal") || lower.includes("show window")) {
    result.spawnMode = "visible";
  }

  // Execution mode detection (interactive vs quiet)
  // Interactive: user sees Claude Code's thinking, tool calls, file reads live
  // Quiet: user only sees the task description and final result
  if (lower.includes("interactive") || lower.includes("show thinking") ||
      lower.includes("show execution") || lower.includes("verbose")) {
    result.executionMode = "interactive";
  } else if (lower.includes("quiet") || lower.includes("hide execution") ||
             lower.includes("hide thinking") || lower.includes("print only")) {
    result.executionMode = "quiet";
  }

  // Auto-close terminal detection
  if (lower.includes("auto close") || lower.includes("autoclose")) {
    result.autoCloseTerminal = true;
  } else if (lower.includes("keep open") || lower.includes("no auto close")) {
    result.autoCloseTerminal = false;
  }

  // Watcher auto-start detection
  if (lower.includes("no watcher") || lower.includes("disable watcher")) {
    result.watcherAutoStart = false;
  } else if (lower.includes("enable watcher")) {
    result.watcherAutoStart = true;
  }

  // Provider targeting
  const providerMap: Record<string, string> = {
    "claude code": "claude-code", claude: "claude-code",
    codex: "codex", aider: "aider",
  };
  for (const [keyword, provider] of Object.entries(providerMap)) {
    if (lower.includes(`for ${keyword}`) || lower.includes(`${keyword} should`)) {
      result.forProvider = provider;
      break;
    }
  }

  // Agent targeting
  const agentMatch = lower.match(/(?:for|the)\s+(\w+)\s+agent/);
  if (agentMatch) {
    result.forAgent = agentMatch[1];
  }

  return result;
}
