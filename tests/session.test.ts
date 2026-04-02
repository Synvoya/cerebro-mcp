// Copyright (c) 2026 Synvoya. Apache-2.0 License.

import { describe, it, expect, afterAll } from "vitest";
import {
  createNewSession,
  getSession,
  pauseSession,
  resumeSession,
  endSession,
  listAllSessions,
  prepareHandoverToken,
  resumeFromToken,
} from "../src/session/manager.js";
import { closeDb } from "../src/session/store.js";

afterAll(() => {
  closeDb();
});

describe("Session Manager", () => {
  let sessionId: string;

  it("creates a new session", () => {
    const session = createNewSession("/tmp/test-project");
    expect(session).toBeDefined();
    expect(session.id).toBeTruthy();
    expect(session.state).toBe("active");
    expect(session.projectPath).toBe("/tmp/test-project");
    sessionId = session.id;
  });

  it("retrieves a session by ID", () => {
    const session = getSession(sessionId);
    expect(session).not.toBeNull();
    expect(session!.id).toBe(sessionId);
    expect(session!.state).toBe("active");
  });

  it("pauses a session", () => {
    const session = pauseSession(sessionId);
    expect(session).not.toBeNull();
    expect(session!.state).toBe("paused");
  });

  it("resumes a paused session", () => {
    const session = resumeSession(sessionId);
    expect(session).not.toBeNull();
    expect(session!.state).toBe("active");
  });

  it("ends a session", () => {
    const session = endSession(sessionId);
    expect(session).not.toBeNull();
    expect(session!.state).toBe("completed");
  });

  it("lists all sessions", () => {
    const sessions = listAllSessions();
    expect(sessions.length).toBeGreaterThan(0);
    expect(sessions.some((s) => s.id === sessionId)).toBe(true);
  });

  it("returns null for non-existent session", () => {
    const session = getSession("non-existent-id");
    expect(session).toBeNull();
  });
});

describe("Session Tokens & Handover", () => {
  it("generates and validates a handover token", () => {
    const session = createNewSession("/tmp/token-test");
    const token = prepareHandoverToken(session.id);
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");
  });

  it("resumes a session from a valid token", () => {
    const session = createNewSession("/tmp/resume-test");
    pauseSession(session.id);
    const token = prepareHandoverToken(session.id);
    expect(token).toBeTruthy();

    const result = resumeFromToken(token!);
    expect(result.session).not.toBeNull();
    expect(result.session!.id).toBe(session.id);
    expect(result.error).toBeUndefined();
  });

  it("rejects an invalid token", () => {
    const result = resumeFromToken("not-a-valid-token");
    expect(result.session).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it("rejects a tampered token", () => {
    const session = createNewSession("/tmp/tamper-test");
    const token = prepareHandoverToken(session.id);
    expect(token).toBeTruthy();

    // Tamper with the token
    const tampered = token!.slice(0, -5) + "XXXXX";
    const result = resumeFromToken(tampered);
    expect(result.session).toBeNull();
  });
});
