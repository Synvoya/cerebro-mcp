// Copyright (c) 2026 Synvoya. Apache-2.0 License.

import Database from "better-sqlite3";
import { join } from "node:path";
import { homedir } from "node:os";
import { mkdirSync } from "node:fs";
import type {
  Session,
  SessionState,
  AgentDefinition,
  TaskEntry,
  AgentHeartbeat,
  AgentMessage,
} from "../types/index.js";

const DATA_DIR = join(homedir(), ".cerebro");
const DB_PATH = join(DATA_DIR, "cerebro.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  initSchema(db);
  return db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      state TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      last_active TEXT NOT NULL,
      project_hash TEXT NOT NULL,
      project_path TEXT NOT NULL DEFAULT '',
      file_manifest TEXT NOT NULL DEFAULT '[]',
      metadata TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      description TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'pending',
      assigned_to TEXT,
      agent_id TEXT,
      created_at TEXT NOT NULL,
      completed_at TEXT,
      result TEXT,
      thread_id TEXT,
      parent_task_id TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS agents (
      agent_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL,
      created_by TEXT NOT NULL DEFAULT 'conversation',
      persona TEXT NOT NULL DEFAULT '',
      tools TEXT NOT NULL DEFAULT '[]',
      preferences TEXT NOT NULL DEFAULT '{}',
      chain_triggers TEXT NOT NULL DEFAULT '{}',
      source TEXT NOT NULL DEFAULT '{}',
      a2a_config TEXT NOT NULL DEFAULT '{}',
      version TEXT NOT NULL DEFAULT '1.0.0',
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS heartbeats (
      agent_id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'idle',
      current_task TEXT,
      task_description TEXT,
      timestamp TEXT NOT NULL,
      message_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      from_agent_id TEXT NOT NULL,
      to_agent_id TEXT NOT NULL,
      content TEXT NOT NULL,
      refs TEXT NOT NULL DEFAULT '[]',
      timestamp TEXT NOT NULL,
      hash TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_session ON tasks(session_id);
    CREATE INDEX IF NOT EXISTS idx_agents_session ON agents(session_id);
    CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);
    CREATE INDEX IF NOT EXISTS idx_messages_to ON messages(to_agent_id);
  `);
}

// ─── Session CRUD ────────────────────────────────────────────────

export function createSession(session: Session): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO sessions (id, state, created_at, last_active, project_hash, project_path, file_manifest, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    session.id,
    session.state,
    session.createdAt,
    session.lastActive,
    session.projectHash,
    session.projectPath,
    JSON.stringify(session.fileManifest),
    JSON.stringify(session.metadata)
  );
}

export function getSession(id: string): Session | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM sessions WHERE id = ?").get(id) as any;
  if (!row) return null;

  const tasks = getTasksForSession(id);
  const agents = getAgentsForSession(id);

  return {
    id: row.id,
    state: row.state as SessionState,
    createdAt: row.created_at,
    lastActive: row.last_active,
    projectHash: row.project_hash,
    projectPath: row.project_path,
    taskQueue: tasks.filter((t) => t.state !== "completed" && t.state !== "failed"),
    completedTasks: tasks.filter((t) => t.state === "completed" || t.state === "failed"),
    fileManifest: JSON.parse(row.file_manifest),
    agents,
    metadata: JSON.parse(row.metadata),
  };
}

export function updateSessionState(id: string, state: SessionState): void {
  const db = getDb();
  db.prepare(
    "UPDATE sessions SET state = ?, last_active = ? WHERE id = ?"
  ).run(state, new Date().toISOString(), id);
}

export function touchSession(id: string): void {
  const db = getDb();
  db.prepare("UPDATE sessions SET last_active = ? WHERE id = ?").run(
    new Date().toISOString(),
    id
  );
}

export function listSessions(): Session[] {
  const db = getDb();
  const rows = db.prepare("SELECT id FROM sessions ORDER BY last_active DESC").all() as any[];
  return rows.map((r) => getSession(r.id)).filter(Boolean) as Session[];
}

// ─── Task CRUD ───────────────────────────────────────────────────

export function createTask(sessionId: string, task: TaskEntry): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO tasks (id, session_id, description, state, assigned_to, agent_id, created_at, completed_at, result, thread_id, parent_task_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    task.id,
    sessionId,
    task.description,
    task.state,
    task.assignedTo,
    task.agentId,
    task.createdAt,
    task.completedAt,
    task.result ? JSON.stringify(task.result) : null,
    task.threadId,
    task.parentTaskId
  );
}

export function updateTaskState(
  taskId: string,
  state: string,
  result?: string
): void {
  const db = getDb();
  const completedAt = state === "completed" || state === "failed"
    ? new Date().toISOString()
    : null;
  db.prepare(
    "UPDATE tasks SET state = ?, completed_at = ?, result = ? WHERE id = ?"
  ).run(state, completedAt, result || null, taskId);
}

function getTasksForSession(sessionId: string): TaskEntry[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM tasks WHERE session_id = ? ORDER BY created_at").all(sessionId) as any[];
  return rows.map((r) => ({
    id: r.id,
    description: r.description,
    state: r.state,
    assignedTo: r.assigned_to,
    agentId: r.agent_id,
    createdAt: r.created_at,
    completedAt: r.completed_at,
    result: r.result ? JSON.parse(r.result) : null,
    threadId: r.thread_id,
    parentTaskId: r.parent_task_id,
  }));
}

// ─── Agent CRUD ──────────────────────────────────────────────────

export function saveAgent(sessionId: string, agent: AgentDefinition): void {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO agents (agent_id, session_id, name, description, created_at, created_by, persona, tools, preferences, chain_triggers, source, a2a_config, version)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    agent.agentId,
    sessionId,
    agent.name,
    agent.description,
    agent.createdAt,
    agent.createdBy,
    agent.persona,
    JSON.stringify(agent.tools),
    JSON.stringify(agent.preferences),
    JSON.stringify(agent.chainTriggers),
    JSON.stringify(agent.source),
    JSON.stringify(agent.a2a),
    agent.version
  );
}

export function getAgent(agentId: string): AgentDefinition | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM agents WHERE agent_id = ?").get(agentId) as any;
  if (!row) return null;
  return rowToAgent(row);
}

export function deleteAgent(agentId: string): void {
  const db = getDb();
  db.prepare("DELETE FROM agents WHERE agent_id = ?").run(agentId);
}

function getAgentsForSession(sessionId: string): AgentDefinition[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM agents WHERE session_id = ?").all(sessionId) as any[];
  return rows.map(rowToAgent);
}

function rowToAgent(row: any): AgentDefinition {
  return {
    agentId: row.agent_id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    createdBy: row.created_by,
    persona: row.persona,
    tools: JSON.parse(row.tools),
    preferences: JSON.parse(row.preferences),
    chainTriggers: JSON.parse(row.chain_triggers),
    source: JSON.parse(row.source),
    a2a: JSON.parse(row.a2a_config),
    version: row.version,
  };
}

// ─── Heartbeat CRUD ──────────────────────────────────────────────

export function upsertHeartbeat(heartbeat: AgentHeartbeat): void {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO heartbeats (agent_id, status, current_task, task_description, timestamp, message_count)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    heartbeat.agentId,
    heartbeat.status,
    heartbeat.currentTask,
    heartbeat.taskDescription,
    heartbeat.timestamp,
    heartbeat.messageCount
  );
}

export function getHeartbeats(): AgentHeartbeat[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM heartbeats").all() as any[];
  return rows.map((r) => ({
    agentId: r.agent_id,
    status: r.status,
    currentTask: r.current_task,
    taskDescription: r.task_description,
    timestamp: r.timestamp,
    messageCount: r.message_count,
  }));
}

// ─── Message Threading ───────────────────────────────────────────

export function saveMessage(msg: AgentMessage): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO messages (id, thread_id, from_agent_id, to_agent_id, content, refs, timestamp, hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    msg.id,
    msg.threadId,
    msg.fromAgentId,
    msg.toAgentId,
    msg.content,
    JSON.stringify(msg.refs),
    msg.timestamp,
    msg.hash
  );
}

export function getMessagesByThread(threadId: string): AgentMessage[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM messages WHERE thread_id = ? ORDER BY timestamp")
    .all(threadId) as any[];
  return rows.map((r) => ({
    id: r.id,
    threadId: r.thread_id,
    fromAgentId: r.from_agent_id,
    toAgentId: r.to_agent_id,
    content: r.content,
    refs: JSON.parse(r.refs),
    timestamp: r.timestamp,
    hash: r.hash,
  }));
}

export function getMessagesForAgent(agentId: string): AgentMessage[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT * FROM messages WHERE to_agent_id = ? ORDER BY timestamp DESC LIMIT 50"
    )
    .all(agentId) as any[];
  return rows.map((r) => ({
    id: r.id,
    threadId: r.thread_id,
    fromAgentId: r.from_agent_id,
    toAgentId: r.to_agent_id,
    content: r.content,
    refs: JSON.parse(r.refs),
    timestamp: r.timestamp,
    hash: r.hash,
  }));
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
