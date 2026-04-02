// Copyright (c) 2026 Synvoya. Apache-2.0 License.

// ─── Session Types ───────────────────────────────────────────────

export interface Session {
  id: string;
  state: SessionState;
  createdAt: string;
  lastActive: string;
  projectHash: string;
  projectPath: string;
  taskQueue: TaskEntry[];
  completedTasks: TaskEntry[];
  fileManifest: string[];
  agents: AgentDefinition[];
  metadata: Record<string, unknown>;
}

export type SessionState = "active" | "paused" | "completed" | "archived";

export interface SessionToken {
  sessionId: string;
  createdAt: string;
  lastActive: string;
  projectHash: string;
  taskQueue: string[];
  completedTasks: string[];
  fileManifest: string[];
  agentIds: string[];
  signature: string;
  version: string;
}

// ─── Task Types ──────────────────────────────────────────────────

export interface TaskEntry {
  id: string;
  description: string;
  state: TaskState;
  assignedTo: string | null;
  agentId: string | null;
  createdAt: string;
  completedAt: string | null;
  result: TaskResult | null;
  threadId: string | null;
  parentTaskId: string | null;
}

export type TaskState =
  | "pending"
  | "submitted"
  | "working"
  | "input-needed"
  | "completed"
  | "failed"
  | "cancelled";

export interface TaskResult {
  success: boolean;
  output: string;
  artifacts: Artifact[];
  duration: number;
  error?: string;
}

export interface Artifact {
  type: "file" | "text" | "data" | "image";
  name: string;
  content: string;
  mimeType?: string;
}

// ─── Agent Types ─────────────────────────────────────────────────

export interface AgentDefinition {
  agentId: string;
  name: string;
  description: string;
  createdAt: string;
  createdBy: AgentSource;
  persona: string;
  tools: string[];
  preferences: AgentPreferences;
  chainTriggers: ChainTriggers;
  source: AgentSourceInfo;
  a2a: AgentA2AConfig;
  version: string;
}

export type AgentSource = "conversation" | "marketplace" | "community" | "external-a2a";

export interface AgentPreferences {
  [key: string]: unknown;
  learned: Record<string, unknown>;
}

export interface ChainTriggers {
  onComplete: string[] | null;
  onError: string[] | null;
}

export interface AgentSourceInfo {
  tier: "user" | "community" | "anthropic" | "external-a2a";
  skillRef: string | null;
}

export interface AgentA2AConfig {
  agentCardUrl: string;
  endpoint: string;
  supportedModalities: string[];
  skills: string[];
  taskLifecycle: boolean;
}

export interface AgentHeartbeat {
  agentId: string;
  status: AgentStatus;
  currentTask: string | null;
  taskDescription: string | null;
  timestamp: string;
  messageCount: number;
}

export type AgentStatus = "online" | "offline" | "working" | "idle" | "stale";

// ─── Agent Message Threading ─────────────────────────────────────

export interface AgentMessage {
  id: string;
  threadId: string;
  fromAgentId: string;
  toAgentId: string;
  content: string;
  refs: string[];
  timestamp: string;
  hash: string;
}

// ─── A2A Types ───────────────────────────────────────────────────

export interface AgentCard {
  name: string;
  description: string;
  version: string;
  endpoint: string;
  capabilities: {
    modalities: string[];
    skills: string[];
    taskLifecycle: boolean;
  };
  authentication: {
    type: string;
    required: boolean;
  };
}

export interface A2ATask {
  id: string;
  fromAgent: string;
  toAgent: string;
  state: TaskState;
  messages: A2AMessage[];
  artifacts: Artifact[];
  createdAt: string;
  updatedAt: string;
}

export interface A2AMessage {
  role: "user" | "agent";
  parts: A2APart[];
  timestamp: string;
}

export interface A2APart {
  type: "text" | "file" | "data";
  text?: string;
  file?: { name: string; mimeType: string; data: string };
  data?: Record<string, unknown>;
}

// ─── Worker Types ────────────────────────────────────────────────

export interface WorkerInstance {
  id: string;
  type: WorkerType;
  provider: CliProvider;
  state: WorkerState;
  sessionId: string;
  taskId: string | null;
  spawnedAt: string;
  lastActivity: string;
  pid: number | null;
}

export type WorkerType = "cli" | "cowork" | "mcp-relay";
export type WorkerState = "spawning" | "ready" | "busy" | "disposing" | "dead";

/**
 * Supported CLI providers — Cerebro is provider-agnostic.
 * Each provider has an adapter that knows how to format instructions.
 */
export type CliProvider = "claude-code" | "codex" | "aider" | "generic";

export interface CliProviderConfig {
  provider: CliProvider;
  binary: string;
  available: boolean;
  taskCategories: string[];
  formatArgs: (task: string, cwd: string) => string[];
  versionCommand: string;
}

/**
 * Worker routing rules — user configures which CLI handles which tasks.
 * Set via natural language: "Use Claude for coding, Codex for testing"
 */
export interface WorkerRoutingRule {
  taskCategory: string;
  provider: CliProvider;
  priority: number;
}

export interface WorkerConfig {
  defaultProvider: CliProvider;
  routingRules: WorkerRoutingRule[];
  providers: Record<string, CliProviderConfig>;
}

// ─── Router Types ────────────────────────────────────────────────

export interface RouteDecision {
  target: "cli" | "agent" | "mcp";
  agentId: string | null;
  confidence: number;
  reasoning: string;
  decomposedSteps: DecomposedStep[];
}

export interface DecomposedStep {
  order: number;
  description: string;
  target: "cli" | "agent" | "mcp";
  agentId: string | null;
  dependsOn: number[];
}

// ─── Vision Types ────────────────────────────────────────────────

// ─── Model & Effort Configuration ────────────────────────────────

export type EffortLevel = "low" | "medium" | "high" | "max";
export type SpawnMode = "visible" | "background";

export interface ModelConfig {
  defaultModel: string | null;
  defaultEffort: EffortLevel;
  defaultSpawnMode: SpawnMode;
  perProvider: Record<string, { model?: string; effort?: EffortLevel }>;
  perAgent: Record<string, { model?: string; effort?: EffortLevel }>;
}

// ─── Vision Types ────────────────────────────────────────────────

export interface ImageAnalysis {
  description: string;
  suggestedActions: string[];
  structuredInstructions: DecomposedStep[];
  confidence: number;
}

// ─── Handover Types ──────────────────────────────────────────────

export interface ContextHealth {
  estimatedUsage: number;
  estimatedRemaining: number;
  warningLevel: "none" | "caution" | "critical";
  shouldHandover: boolean;
  handoverReady: boolean;
}

export interface HandoverData {
  session: Session;
  token: SessionToken;
  contextHealth: ContextHealth;
  timestamp: string;
}

// ─── Config Types ────────────────────────────────────────────────

export interface CerebroConfig {
  agents: AgentConfigEntry[];
  projectType?: string;
  defaultChainTriggers?: ChainTriggers;
}

export interface AgentConfigEntry {
  name: string;
  description: string;
  persona: string;
  tools: string[];
  chainTriggers?: ChainTriggers;
}

// ─── Notification Types ──────────────────────────────────────────

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  sessionId: string;
  taskId: string | null;
  agentId: string | null;
  timestamp: string;
  read: boolean;
}

export type NotificationType =
  | "task-completed"
  | "task-failed"
  | "build-success"
  | "build-error"
  | "test-results"
  | "approval-needed"
  | "context-warning"
  | "agent-online"
  | "agent-offline"
  | "handover-ready";
