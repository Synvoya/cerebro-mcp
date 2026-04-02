// Copyright (c) 2026 Synvoya. Apache-2.0 License.

import { v4 as uuidv4 } from "uuid";
import type { AgentMessage } from "../types/index.js";
import { saveMessage, getMessagesByThread, getMessagesForAgent } from "../session/store.js";
import { generateMessageHash } from "../security/crypto.js";

/**
 * Send a threaded message from one agent to another.
 */
export function sendMessage(
  fromAgentId: string,
  toAgentId: string,
  content: string,
  threadId?: string,
  refs?: string[]
): AgentMessage {
  const now = new Date().toISOString();
  const message: AgentMessage = {
    id: uuidv4(),
    threadId: threadId || uuidv4(),
    fromAgentId,
    toAgentId,
    content,
    refs: refs || [],
    timestamp: now,
    hash: generateMessageHash(content, now),
  };

  saveMessage(message);
  return message;
}

/**
 * Reply to a specific message in a thread.
 */
export function replyToMessage(
  fromAgentId: string,
  toAgentId: string,
  content: string,
  replyToHash: string,
  threadId: string
): AgentMessage {
  return sendMessage(fromAgentId, toAgentId, content, threadId, [replyToHash]);
}

/**
 * Get the full conversation thread.
 */
export function getThread(threadId: string): AgentMessage[] {
  return getMessagesByThread(threadId);
}

/**
 * Get recent messages for an agent (inbox).
 */
export function getInbox(agentId: string): AgentMessage[] {
  return getMessagesForAgent(agentId);
}

/**
 * Get conversation between two specific agents.
 */
export function getConversation(
  agentA: string,
  agentB: string,
  limit = 50
): AgentMessage[] {
  const messagesA = getMessagesForAgent(agentA);
  const messagesB = getMessagesForAgent(agentB);

  const all = [...messagesA, ...messagesB].filter(
    (m) =>
      (m.fromAgentId === agentA && m.toAgentId === agentB) ||
      (m.fromAgentId === agentB && m.toAgentId === agentA)
  );

  // Deduplicate by id
  const seen = new Set<string>();
  const unique = all.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });

  unique.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return unique.slice(-limit);
}
