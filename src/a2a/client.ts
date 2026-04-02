// Copyright (c) 2026 Synvoya. Apache-2.0 License.

import type { A2ATask, A2AMessage, AgentCard } from "../types/index.js";
import { handleIncomingTask } from "./server.js";

/**
 * Send a task to a local agent via A2A protocol (internal delegation).
 */
export function sendLocalTask(
  fromAgent: string,
  toAgent: string,
  taskDescription: string
): A2ATask {
  const message: A2AMessage = {
    role: "user",
    parts: [{ type: "text", text: taskDescription }],
    timestamp: new Date().toISOString(),
  };

  return handleIncomingTask(fromAgent, toAgent, [message]);
}

/**
 * Send a task to a remote A2A agent via HTTP.
 * Follows the A2A protocol: POST to agent's endpoint with JSON-RPC.
 */
export async function sendRemoteTask(
  agentCard: AgentCard,
  fromAgent: string,
  taskDescription: string
): Promise<A2ATask | null> {
  try {
    const payload = {
      jsonrpc: "2.0",
      id: `cerebro-${Date.now()}`,
      method: "message/send",
      params: {
        message: {
          role: "user",
          parts: [{ type: "text", text: taskDescription }],
        },
      },
    };

    const response = await fetch(agentCard.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`A2A remote task failed: ${response.status}`);
      return null;
    }

    const result = await response.json();
    return result.result as A2ATask;
  } catch (err) {
    console.error(`A2A remote task error: ${err}`);
    return null;
  }
}

/**
 * Check the status of a remote A2A task.
 */
export async function checkRemoteTaskStatus(
  endpoint: string,
  taskId: string
): Promise<A2ATask | null> {
  try {
    const payload = {
      jsonrpc: "2.0",
      id: `cerebro-status-${Date.now()}`,
      method: "tasks/get",
      params: { id: taskId },
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) return null;

    const result = await response.json();
    return result.result as A2ATask;
  } catch {
    return null;
  }
}
