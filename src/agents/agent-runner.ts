// Copyright (c) 2026 Synvoya. Apache-2.0 License.
// Agent Runner — executes agent tasks with fresh context per call.
// Wires up to terminal spawner for visible CLI execution.

import type { AgentDefinition, TaskResult, CliProvider } from "../types/index.js";
import { spawnTask } from "../workers/terminal-spawner.js";
import { resolveProvider } from "../workers/pool.js";
import { resolveModel, resolveEffort, resolveSpawnMode } from "../workers/model-config.js";
import { upsertHeartbeat } from "../session/store.js";
import { updateTaskState } from "../session/store.js";

/**
 * Execute a task using a specific agent.
 * Each invocation gets a FRESH context — agent definitions persist,
 * but working context is wiped after each task. Zero context rot.
 *
 * Opens a visible Terminal window by default so the user can watch.
 */
export async function runAgentTask(
  agent: AgentDefinition,
  taskId: string,
  sessionId: string,
  taskDescription: string,
  projectPath: string,
  options?: {
    model?: string;
    effort?: string;
    mode?: "visible" | "background";
    provider?: CliProvider;
    autoCloseTerminal?: boolean;
  }
): Promise<TaskResult> {
  // Resolve configuration (per-task > per-agent > per-provider > defaults)
  const provider = options?.provider || resolveProvider(agent.name) || resolveProvider(agent.description) || resolveProvider(taskDescription) || "claude-code";
  const model = resolveModel(provider, agent.agentId, options?.model);
  const effort = options?.effort || resolveEffort(provider, agent.agentId);
  const mode = options?.mode || resolveSpawnMode();

  // Broadcast task start via heartbeat
  upsertHeartbeat({
    agentId: agent.agentId,
    status: "working",
    currentTask: taskId,
    taskDescription: `${agent.name}: ${taskDescription}`,
    timestamp: new Date().toISOString(),
    messageCount: 0,
  });

  // Update task state to working
  updateTaskState(taskId, "working");

  // Build the prompt with agent persona + preferences + task
  const fullTask = buildAgentPrompt(agent, taskDescription);

  try {
    const result = await spawnTask({
      taskId,
      agentName: agent.name,
      taskDescription: fullTask,
      provider,
      cwd: projectPath,
      mode,
      model,
      effort,
      autoCloseTerminal: options?.autoCloseTerminal,
    });

    // Update task state based on result
    updateTaskState(
      taskId,
      result.success ? "completed" : "failed",
      JSON.stringify(result)
    );

    // Broadcast completion
    upsertHeartbeat({
      agentId: agent.agentId,
      status: "idle",
      currentTask: null,
      taskDescription: result.success
        ? `✅ Completed: ${taskDescription.slice(0, 100)}`
        : `❌ Failed: ${result.error?.slice(0, 100) || "Unknown error"}`,
      timestamp: new Date().toISOString(),
      messageCount: 0,
    });

    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);

    updateTaskState(taskId, "failed", JSON.stringify({ error }));

    upsertHeartbeat({
      agentId: agent.agentId,
      status: "idle",
      currentTask: null,
      taskDescription: `❌ Error: ${error.slice(0, 100)}`,
      timestamp: new Date().toISOString(),
      messageCount: 0,
    });

    return {
      success: false,
      output: "",
      artifacts: [],
      duration: 0,
      error,
    };
  }
}

/**
 * Build the complete prompt for an agent execution.
 * Includes persona, learned preferences, and the current task.
 */
function buildAgentPrompt(agent: AgentDefinition, task: string): string {
  const parts: string[] = [];

  // Persona
  parts.push(agent.persona);

  // Learned preferences
  const learned = agent.preferences.learned;
  if (Object.keys(learned).length > 0) {
    parts.push(
      "\nPreferences from past interactions:\n" +
        Object.entries(learned)
          .map(([k, v]) => `- ${k}: ${v}`)
          .join("\n")
    );
  }

  // The actual task
  parts.push(`\nTask: ${task}`);

  return parts.join("\n");
}
