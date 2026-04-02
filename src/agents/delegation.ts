// Copyright (c) 2026 Synvoya. Apache-2.0 License.

import { v4 as uuidv4 } from "uuid";
import type { AgentDefinition, TaskEntry, AgentMessage } from "../types/index.js";
import { getAgent, createTask, saveMessage } from "../session/store.js";
import { generateMessageHash } from "../security/crypto.js";

/**
 * Delegate a task from one agent to another via A2A protocol.
 * Creates the task entry and an A2A message in the thread.
 */
export function delegateTask(
  fromAgentId: string,
  toAgentId: string,
  sessionId: string,
  taskDescription: string,
  parentTaskId?: string
): { task: TaskEntry; message: AgentMessage } | null {
  const fromAgent = getAgent(fromAgentId);
  const toAgent = getAgent(toAgentId);

  if (!fromAgent || !toAgent) return null;

  const now = new Date().toISOString();
  const taskId = uuidv4();
  const threadId = parentTaskId || uuidv4();

  const task: TaskEntry = {
    id: taskId,
    description: taskDescription,
    state: "submitted",
    assignedTo: toAgent.name,
    agentId: toAgentId,
    createdAt: now,
    completedAt: null,
    result: null,
    threadId,
    parentTaskId: parentTaskId || null,
  };

  createTask(sessionId, task);

  // Create A2A message for the delegation
  const messageContent = `Task delegated: ${taskDescription}`;
  const message: AgentMessage = {
    id: uuidv4(),
    threadId,
    fromAgentId,
    toAgentId,
    content: messageContent,
    refs: parentTaskId ? [parentTaskId] : [],
    timestamp: now,
    hash: generateMessageHash(messageContent, now),
  };

  saveMessage(message);

  return { task, message };
}

/**
 * Process chain triggers after a task completes.
 * If the agent has onComplete triggers, delegate to those agents.
 */
export function processChainTriggers(
  agent: AgentDefinition,
  sessionId: string,
  completedTaskId: string,
  taskDescription: string
): { task: TaskEntry; message: AgentMessage }[] {
  const results: { task: TaskEntry; message: AgentMessage }[] = [];

  if (!agent.chainTriggers.onComplete) return results;

  for (const targetAgentId of agent.chainTriggers.onComplete) {
    const targetAgent = getAgent(targetAgentId);
    if (!targetAgent) continue;

    const delegation = delegateTask(
      agent.agentId,
      targetAgentId,
      sessionId,
      `Follow-up from ${agent.name}: ${taskDescription}`,
      completedTaskId
    );

    if (delegation) {
      results.push(delegation);
    }
  }

  return results;
}

/**
 * Process error chain triggers when a task fails.
 */
export function processErrorTriggers(
  agent: AgentDefinition,
  sessionId: string,
  failedTaskId: string,
  error: string
): { task: TaskEntry; message: AgentMessage }[] {
  const results: { task: TaskEntry; message: AgentMessage }[] = [];

  if (!agent.chainTriggers.onError) return results;

  for (const targetAgentId of agent.chainTriggers.onError) {
    const delegation = delegateTask(
      agent.agentId,
      targetAgentId,
      sessionId,
      `Error handling from ${agent.name}: ${error}`,
      failedTaskId
    );

    if (delegation) {
      results.push(delegation);
    }
  }

  return results;
}
