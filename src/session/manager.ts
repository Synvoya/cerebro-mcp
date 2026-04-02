// Copyright (c) 2026 Synvoya. Apache-2.0 License.

import { v4 as uuidv4 } from "uuid";
import type { Session, SessionState } from "../types/index.js";
import { hashProjectState } from "../security/crypto.js";
import {
  createSession as dbCreateSession,
  getSession as dbGetSession,
  updateSessionState as dbUpdateState,
  touchSession as dbTouch,
  listSessions as dbListSessions,
} from "./store.js";
import { generateToken, validateToken, serializeToken, deserializeToken } from "./token.js";

export function createNewSession(projectPath: string): Session {
  const now = new Date().toISOString();
  const session: Session = {
    id: uuidv4(),
    state: "active",
    createdAt: now,
    lastActive: now,
    projectHash: hashProjectState(projectPath, []),
    projectPath,
    taskQueue: [],
    completedTasks: [],
    fileManifest: [],
    agents: [],
    metadata: {},
  };

  dbCreateSession(session);
  return session;
}

export function getSession(sessionId: string): Session | null {
  return dbGetSession(sessionId);
}

export function pauseSession(sessionId: string): Session | null {
  dbUpdateState(sessionId, "paused");
  return dbGetSession(sessionId);
}

export function resumeSession(sessionId: string): Session | null {
  const session = dbGetSession(sessionId);
  if (!session) return null;
  if (session.state !== "paused") return session;
  dbUpdateState(sessionId, "active");
  return dbGetSession(sessionId);
}

export function endSession(sessionId: string): Session | null {
  dbUpdateState(sessionId, "completed");
  return dbGetSession(sessionId);
}

export function listAllSessions(): Session[] {
  return dbListSessions();
}

export function resumeFromToken(encodedToken: string): {
  session: Session | null;
  error?: string;
} {
  let token;
  try {
    token = deserializeToken(encodedToken);
  } catch {
    return { session: null, error: "Failed to decode token" };
  }

  const validation = validateToken(token);
  if (!validation.valid) {
    return { session: null, error: validation.error };
  }

  const session = dbGetSession(token.sessionId);
  if (!session) {
    return { session: null, error: `Session ${token.sessionId} not found` };
  }

  dbUpdateState(token.sessionId, "active");
  dbTouch(token.sessionId);
  return { session: dbGetSession(token.sessionId) };
}

export function prepareHandoverToken(sessionId: string): string | null {
  const session = dbGetSession(sessionId);
  if (!session) return null;
  const token = generateToken(session);
  return serializeToken(token);
}
