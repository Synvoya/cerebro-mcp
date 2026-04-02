// Copyright (c) 2026 Synvoya. Apache-2.0 License.

import type { A2ATask, A2AMessage, TaskState } from "../types/index.js";
import { v4 as uuidv4 } from "uuid";

const activeTasks = new Map<string, A2ATask>();

/**
 * Handle an incoming A2A task from an external agent.
 * Follows the A2A protocol: message/send → task created → status updates.
 */
export function handleIncomingTask(
  fromAgent: string,
  toAgent: string,
  messages: A2AMessage[]
): A2ATask {
  const now = new Date().toISOString();
  const task: A2ATask = {
    id: uuidv4(),
    fromAgent,
    toAgent,
    state: "submitted",
    messages,
    artifacts: [],
    createdAt: now,
    updatedAt: now,
  };

  activeTasks.set(task.id, task);
  return task;
}

/**
 * Update the state of an A2A task.
 */
export function updateA2ATaskState(
  taskId: string,
  state: TaskState,
  message?: A2AMessage
): A2ATask | null {
  const task = activeTasks.get(taskId);
  if (!task) return null;

  task.state = state;
  task.updatedAt = new Date().toISOString();

  if (message) {
    task.messages.push(message);
  }

  return task;
}

/**
 * Get an A2A task by ID.
 */
export function getA2ATask(taskId: string): A2ATask | null {
  return activeTasks.get(taskId) || null;
}

/**
 * List all active A2A tasks.
 */
export function listA2ATasks(): A2ATask[] {
  return Array.from(activeTasks.values());
}

/**
 * Complete an A2A task with final artifacts.
 */
export function completeA2ATask(
  taskId: string,
  output: string,
  artifacts?: { type: string; name: string; content: string }[]
): A2ATask | null {
  const task = activeTasks.get(taskId);
  if (!task) return null;

  task.state = "completed";
  task.updatedAt = new Date().toISOString();

  task.messages.push({
    role: "agent",
    parts: [{ type: "text", text: output }],
    timestamp: task.updatedAt,
  });

  if (artifacts) {
    for (const a of artifacts) {
      task.artifacts.push({
        type: a.type as any,
        name: a.name,
        content: a.content,
      });
    }
  }

  return task;
}
