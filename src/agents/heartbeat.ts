// Copyright (c) 2026 Synvoya. Apache-2.0 License.

import type { AgentHeartbeat, AgentStatus } from "../types/index.js";
import { upsertHeartbeat, getHeartbeats } from "../session/store.js";

const STALE_THRESHOLD_MS = 30000; // 30 seconds without heartbeat = stale

/**
 * Send a heartbeat for an agent — updates presence and current task.
 */
export function sendHeartbeat(
  agentId: string,
  status: AgentStatus,
  taskDescription?: string
): void {
  upsertHeartbeat({
    agentId,
    status,
    currentTask: taskDescription || null,
    taskDescription: taskDescription || null,
    timestamp: new Date().toISOString(),
    messageCount: 0,
  });
}

/**
 * Get the live roster — all agents with their current status.
 * Marks agents as stale if their last heartbeat is too old.
 */
export function getRoster(): AgentHeartbeat[] {
  const heartbeats = getHeartbeats();
  const now = Date.now();

  return heartbeats.map((hb) => {
    const lastSeen = new Date(hb.timestamp).getTime();
    const age = now - lastSeen;

    if (age > STALE_THRESHOLD_MS && hb.status !== "offline") {
      return { ...hb, status: "stale" as AgentStatus };
    }
    return hb;
  });
}

/**
 * Get online agents only.
 */
export function getOnlineAgents(): AgentHeartbeat[] {
  return getRoster().filter(
    (hb) => hb.status === "online" || hb.status === "working" || hb.status === "idle"
  );
}

/**
 * Mark an agent as offline.
 */
export function markOffline(agentId: string): void {
  sendHeartbeat(agentId, "offline");
}

/**
 * Broadcast a task description to the swarm.
 * Other agents and the dashboard see what this agent is doing.
 */
export function broadcastTask(
  agentId: string,
  agentName: string,
  taskDescription: string
): void {
  sendHeartbeat(agentId, "working", `${agentName}: ${taskDescription}`);
}
