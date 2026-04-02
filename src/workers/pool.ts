// Copyright (c) 2026 Synvoya. Apache-2.0 License.

import { v4 as uuidv4 } from "uuid";
import type { WorkerInstance, WorkerType, WorkerState, CliProvider, WorkerRoutingRule } from "../types/index.js";

const workers = new Map<string, WorkerInstance>();
const routingRules: WorkerRoutingRule[] = [];
let defaultProvider: CliProvider = "claude-code";

// ─── Worker Lifecycle ────────────────────────────────────────────

export function spawnWorker(
  sessionId: string,
  type: WorkerType = "cli",
  provider: CliProvider = defaultProvider
): WorkerInstance {
  const worker: WorkerInstance = {
    id: uuidv4(),
    type,
    provider,
    state: "spawning",
    sessionId,
    taskId: null,
    spawnedAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    pid: null,
  };

  workers.set(worker.id, worker);
  worker.state = "ready";
  return worker;
}

export function assignTask(workerId: string, taskId: string): boolean {
  const worker = workers.get(workerId);
  if (!worker || worker.state !== "ready") return false;

  worker.state = "busy";
  worker.taskId = taskId;
  worker.lastActivity = new Date().toISOString();
  return true;
}

export function releaseWorker(workerId: string): void {
  const worker = workers.get(workerId);
  if (!worker) return;
  // Anti-context-rot: dispose worker after task, don't reuse
  worker.state = "disposing";
  worker.taskId = null;
  workers.delete(workerId);
}

export function getWorker(workerId: string): WorkerInstance | undefined {
  return workers.get(workerId);
}

export function getActiveWorkers(sessionId?: string): WorkerInstance[] {
  const all = Array.from(workers.values());
  return sessionId ? all.filter((w) => w.sessionId === sessionId) : all;
}

/**
 * Get a fresh worker for a task — always spawns new (anti-context-rot).
 * Selects provider based on routing rules + task category.
 */
export function getAvailableWorker(
  sessionId: string,
  taskCategory?: string
): WorkerInstance {
  const provider = resolveProvider(taskCategory);
  return spawnWorker(sessionId, "cli", provider);
}

export function disposeAllWorkers(sessionId: string): number {
  let count = 0;
  for (const [id, worker] of workers) {
    if (worker.sessionId === sessionId) {
      worker.state = "disposing";
      workers.delete(id);
      count++;
    }
  }
  return count;
}

export function getPoolStats(): {
  total: number;
  ready: number;
  busy: number;
  byProvider: Record<string, number>;
} {
  const all = Array.from(workers.values());
  const byProvider: Record<string, number> = {};
  for (const w of all) {
    byProvider[w.provider] = (byProvider[w.provider] || 0) + 1;
  }
  return {
    total: all.length,
    ready: all.filter((w) => w.state === "ready").length,
    busy: all.filter((w) => w.state === "busy").length,
    byProvider,
  };
}

// ─── Provider Routing ────────────────────────────────────────────

/**
 * Configure which CLI provider handles which task categories.
 * Called via natural language: "Use Claude for coding, Codex for testing"
 */
export function setRoutingRule(taskCategory: string, provider: CliProvider, priority = 1): void {
  // Remove existing rule for this category
  const idx = routingRules.findIndex((r) => r.taskCategory === taskCategory);
  if (idx >= 0) routingRules.splice(idx, 1);

  routingRules.push({ taskCategory, provider, priority });
  routingRules.sort((a, b) => b.priority - a.priority);
}

/**
 * Set the default provider when no routing rule matches.
 */
export function setDefaultProvider(provider: CliProvider): void {
  defaultProvider = provider;
}

/**
 * Get the current default provider.
 */
export function getDefaultProvider(): CliProvider {
  return defaultProvider;
}

/**
 * Resolve which provider to use for a task category.
 */
export function resolveProvider(taskCategory?: string): CliProvider {
  if (!taskCategory) return defaultProvider;

  const lower = taskCategory.toLowerCase();
  for (const rule of routingRules) {
    const ruleLC = rule.taskCategory.toLowerCase();
    if (lower.includes(ruleLC) || ruleLC.includes(lower)) {
      return rule.provider;
    }
  }
  return defaultProvider;
}

/**
 * Get all current routing rules.
 */
export function getRoutingRules(): WorkerRoutingRule[] {
  return [...routingRules];
}

/**
 * Clear all routing rules.
 */
export function clearRoutingRules(): void {
  routingRules.length = 0;
}

/**
 * Parse natural language routing configuration.
 * "Use Claude for coding and Codex for testing"
 * "Set Aider as default"
 */
export function parseRoutingConfig(instruction: string): {
  rules: WorkerRoutingRule[];
  defaultProvider?: CliProvider;
} {
  const lower = instruction.toLowerCase();
  const rules: WorkerRoutingRule[] = [];
  let parsedDefault: CliProvider | undefined;

  const providerMap: Record<string, CliProvider> = {
    claude: "claude-code",
    "claude code": "claude-code",
    codex: "codex",
    aider: "aider",
    shell: "generic",
    generic: "generic",
  };

  // Pattern: "Use X for Y" or "X for Y"
  const usePattern = /(?:use\s+)?(claude(?:\s+code)?|codex|aider|shell|generic)\s+(?:for|to\s+handle)\s+(\w[\w\s,]+)/gi;
  let match;
  while ((match = usePattern.exec(instruction)) !== null) {
    const providerName = match[1].toLowerCase().trim();
    const categories = match[2].split(/[,&]/).map((c) => c.trim()).filter(Boolean);
    const provider = providerMap[providerName] || "generic";

    for (const cat of categories) {
      rules.push({ taskCategory: cat, provider, priority: 1 });
    }
  }

  // Pattern: "Set X as default" or "default to X"
  const defaultPattern = /(?:set\s+|default\s+(?:to\s+)?)(claude(?:\s+code)?|codex|aider|shell|generic)\s+(?:as\s+)?default/i;
  const defaultMatch = lower.match(defaultPattern);
  if (defaultMatch) {
    parsedDefault = providerMap[defaultMatch[1].toLowerCase().trim()] || "generic";
  }

  return { rules, defaultProvider: parsedDefault };
}
