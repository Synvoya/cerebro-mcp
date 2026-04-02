// Copyright (c) 2026 Synvoya. Apache-2.0 License.

import type { AgentDefinition, AgentHeartbeat } from "../types/index.js";
import { getHeartbeats } from "../session/store.js";
import { getRoster } from "../agents/heartbeat.js";

export interface DashboardData {
  agents: DashboardAgent[];
  summary: {
    total: number;
    online: number;
    working: number;
    idle: number;
    offline: number;
  };
  timestamp: string;
}

export interface DashboardAgent {
  agentId: string;
  name: string;
  description: string;
  status: string;
  currentTask: string | null;
  createdBy: string;
  skills: string[];
  lastSeen: string;
}

/**
 * Generate dashboard data for all agents in a session.
 */
export function getDashboardData(
  agents: AgentDefinition[]
): DashboardData {
  const roster = getRoster();
  const heartbeatMap = new Map(roster.map((h) => [h.agentId, h]));

  const dashAgents: DashboardAgent[] = agents.map((agent) => {
    const hb = heartbeatMap.get(agent.agentId);
    return {
      agentId: agent.agentId,
      name: agent.name,
      description: agent.description,
      status: hb?.status || "offline",
      currentTask: hb?.taskDescription || null,
      createdBy: agent.createdBy,
      skills: agent.a2a.skills,
      lastSeen: hb?.timestamp || agent.createdAt,
    };
  });

  const summary = {
    total: dashAgents.length,
    online: dashAgents.filter((a) => a.status === "online" || a.status === "idle").length,
    working: dashAgents.filter((a) => a.status === "working").length,
    idle: dashAgents.filter((a) => a.status === "idle").length,
    offline: dashAgents.filter((a) => a.status === "offline" || a.status === "stale").length,
  };

  return {
    agents: dashAgents,
    summary,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Format dashboard data as a human-readable string.
 */
export function formatDashboard(data: DashboardData): string {
  const lines: string[] = [
    `Agent Swarm Dashboard — ${data.summary.total} agents`,
    `Online: ${data.summary.online} | Working: ${data.summary.working} | Offline: ${data.summary.offline}`,
    ``,
  ];

  for (const agent of data.agents) {
    const statusIcon =
      agent.status === "working" ? "🔨" :
      agent.status === "online" || agent.status === "idle" ? "🟢" :
      agent.status === "stale" ? "🟡" : "⚫";

    lines.push(`${statusIcon} ${agent.name} [${agent.status}]`);
    if (agent.currentTask) {
      lines.push(`   └─ ${agent.currentTask}`);
    }
  }

  return lines.join("\n");
}
