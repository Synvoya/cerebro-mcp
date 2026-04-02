// Copyright (c) 2026 Synvoya. Apache-2.0 License.

import type { Session, HandoverData, ContextHealth } from "../types/index.js";
import { getSession } from "../session/store.js";
import { generateToken, serializeToken } from "../session/token.js";
import { getContextHealth } from "./context-monitor.js";

/**
 * Prepare a complete handover package for session continuity.
 * Includes session state, token, and context health.
 */
export function prepareHandover(sessionId: string): HandoverData | null {
  const session = getSession(sessionId);
  if (!session) return null;

  const token = generateToken(session);
  const health = getContextHealth();

  return {
    session,
    token,
    contextHealth: health,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generate a compact handover string suitable for copy-paste.
 */
export function generateHandoverString(sessionId: string): string | null {
  const session = getSession(sessionId);
  if (!session) return null;

  const token = generateToken(session);
  return serializeToken(token);
}

/**
 * Generate a human-readable handover summary.
 */
export function generateHandoverSummary(sessionId: string): string | null {
  const session = getSession(sessionId);
  if (!session) return null;

  const lines: string[] = [
    `## Cerebro Session Handover`,
    ``,
    `**Session ID:** ${session.id}`,
    `**Project:** ${session.projectPath}`,
    `**Last active:** ${session.lastActive}`,
    ``,
    `### Status`,
    `- Pending tasks: ${session.taskQueue.length}`,
    `- Completed tasks: ${session.completedTasks.length}`,
    `- Active agents: ${session.agents.length}`,
    ``,
  ];

  if (session.taskQueue.length > 0) {
    lines.push(`### Pending Tasks`);
    for (const task of session.taskQueue) {
      lines.push(`- [${task.state}] ${task.description}`);
    }
    lines.push(``);
  }

  if (session.agents.length > 0) {
    lines.push(`### Agents`);
    for (const agent of session.agents) {
      lines.push(`- **${agent.name}**: ${agent.description}`);
    }
    lines.push(``);
  }

  const token = generateToken(session);
  const encoded = serializeToken(token);
  lines.push(`### Handover Token`);
  lines.push(`\`\`\``);
  lines.push(encoded);
  lines.push(`\`\`\``);
  lines.push(``);
  lines.push(`Paste this token with \`resume_session\` to continue.`);

  return lines.join("\n");
}
