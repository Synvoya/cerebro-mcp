// Copyright (c) 2026 Synvoya. Apache-2.0 License.

import type { Session, SessionToken } from "../types/index.js";
import { signToken, verifySignature, hashProjectState } from "../security/crypto.js";

const TOKEN_VERSION = "1.0.0";

export function generateToken(session: Session): SessionToken {
  const payload = JSON.stringify({
    sessionId: session.id,
    createdAt: session.createdAt,
    lastActive: session.lastActive,
    projectHash: session.projectHash,
    taskQueue: session.taskQueue.map((t) => t.id),
    completedTasks: session.completedTasks.map((t) => t.id),
    fileManifest: session.fileManifest,
    agentIds: session.agents.map((a) => a.agentId),
    version: TOKEN_VERSION,
  });

  const signature = signToken(payload);

  return {
    sessionId: session.id,
    createdAt: session.createdAt,
    lastActive: session.lastActive,
    projectHash: session.projectHash,
    taskQueue: session.taskQueue.map((t) => t.id),
    completedTasks: session.completedTasks.map((t) => t.id),
    fileManifest: session.fileManifest,
    agentIds: session.agents.map((a) => a.agentId),
    signature,
    version: TOKEN_VERSION,
  };
}

export function validateToken(token: SessionToken): {
  valid: boolean;
  error?: string;
} {
  if (token.version !== TOKEN_VERSION) {
    return { valid: false, error: `Token version mismatch: expected ${TOKEN_VERSION}, got ${token.version}` };
  }

  const payload = JSON.stringify({
    sessionId: token.sessionId,
    createdAt: token.createdAt,
    lastActive: token.lastActive,
    projectHash: token.projectHash,
    taskQueue: token.taskQueue,
    completedTasks: token.completedTasks,
    fileManifest: token.fileManifest,
    agentIds: token.agentIds,
    version: token.version,
  });

  if (!verifySignature(payload, token.signature)) {
    return { valid: false, error: "Invalid signature — token may have been tampered with" };
  }

  return { valid: true };
}

export function serializeToken(token: SessionToken): string {
  return Buffer.from(JSON.stringify(token)).toString("base64url");
}

export function deserializeToken(encoded: string): SessionToken {
  const json = Buffer.from(encoded, "base64url").toString("utf-8");
  return JSON.parse(json) as SessionToken;
}
