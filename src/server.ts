#!/usr/bin/env node
// Copyright (c) 2026 Synvoya. Apache-2.0 License.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  createNewSession,
  getSession,
  pauseSession,
  resumeSession,
  endSession,
  listAllSessions,
  resumeFromToken,
  prepareHandoverToken,
} from "./session/manager.js";
import { createTask, updateTaskState } from "./session/store.js";
import { v4 as uuidv4 } from "uuid";

export function createCerebroServer(): McpServer {
  const server = new McpServer({
    name: "cerebro-mcp",
    version: "0.1.0",
  });

  // ─── Session Tools ───────────────────────────────────────────

  server.tool(
    "create_session",
    "Create a new Cerebro session and project workspace",
    {
      projectPath: z.string().describe("Path to the project directory"),
      description: z.string().optional().describe("Optional project description"),
    },
    async ({ projectPath, description }) => {
      // Resolve ~ to home directory
      const { homedir } = await import("node:os");
      const { existsSync, mkdirSync } = await import("node:fs");
      const resolvedPath = projectPath.replace(/^~/, homedir());

      // If directory doesn't exist, create it
      if (!existsSync(resolvedPath)) {
        try {
          mkdirSync(resolvedPath, { recursive: true });
        } catch (err) {
          return {
            content: [{
              type: "text",
              text: `Could not create directory "${projectPath}". Please specify a writable folder path where Cerebro should save project files. Example: ~/Projects/my-app`,
            }],
            isError: true,
          };
        }
      }

      const session = createNewSession(resolvedPath);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                sessionId: session.id,
                state: session.state,
                projectPath: resolvedPath,
                message: `Session created. ID: ${session.id}. Working directory: ${resolvedPath}`,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "resume_session",
    "Resume an existing session using a handover token",
    {
      token: z.string().describe("Base64url-encoded handover token"),
    },
    async ({ token }) => {
      const result = resumeFromToken(token);
      if (!result.session) {
        return {
          content: [{ type: "text", text: `Failed to resume: ${result.error}` }],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                sessionId: result.session.id,
                state: result.session.state,
                pendingTasks: result.session.taskQueue.length,
                agents: result.session.agents.length,
                message: "Session resumed successfully",
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "pause_session",
    "Pause an active session for later resumption",
    { sessionId: z.string().describe("Session ID to pause") },
    async ({ sessionId }) => {
      const session = pauseSession(sessionId);
      if (!session) {
        return { content: [{ type: "text", text: "Session not found" }], isError: true };
      }
      return {
        content: [{ type: "text", text: `Session ${sessionId} paused.` }],
      };
    }
  );

  server.tool(
    "end_session",
    "Complete and archive a session",
    { sessionId: z.string().describe("Session ID to end") },
    async ({ sessionId }) => {
      const session = endSession(sessionId);
      if (!session) {
        return { content: [{ type: "text", text: "Session not found" }], isError: true };
      }
      return {
        content: [
          {
            type: "text",
            text: `Session ${sessionId} completed. ${session.completedTasks.length} tasks archived.`,
          },
        ],
      };
    }
  );

  server.tool(
    "list_sessions",
    "List all active, paused, and recent sessions",
    {},
    async () => {
      const sessions = listAllSessions();
      const summary = sessions.map((s) => ({
        id: s.id,
        state: s.state,
        lastActive: s.lastActive,
        taskCount: s.taskQueue.length + s.completedTasks.length,
        agentCount: s.agents.length,
      }));
      return {
        content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      };
    }
  );

  // ─── Task Tools ──────────────────────────────────────────────

  server.tool(
    "execute_task",
    "Send a task to the appropriate worker or agent for execution",
    {
      sessionId: z.string().describe("Session ID"),
      description: z.string().describe("What to do, in natural language"),
      targetAgent: z.string().optional().describe("Specific agent to route to (optional)"),
    },
    async ({ sessionId, description, targetAgent }) => {
      const session = getSession(sessionId);
      if (!session) {
        return { content: [{ type: "text", text: "Session not found" }], isError: true };
      }

      const taskId = uuidv4();
      const now = new Date().toISOString();
      createTask(sessionId, {
        id: taskId,
        description,
        state: "submitted",
        assignedTo: targetAgent || null,
        agentId: targetAgent || null,
        createdAt: now,
        completedAt: null,
        result: null,
        threadId: uuidv4(),
        parentTaskId: null,
      });

      // Route to agent or CLI worker
      const { routeTask } = await import("./router/task-router.js");
      const { runAgentTask } = await import("./agents/agent-runner.js");
      const { spawnTask } = await import("./workers/terminal-spawner.js");
      const { resolveModel, resolveEffort, resolveSpawnMode } = await import("./workers/model-config.js");
      const { getAgent } = await import("./session/store.js");
      // If a specific agent was requested, delegate directly
      if (targetAgent) {
        const agent = getAgent(targetAgent);
        if (agent) {
          // Execute asynchronously — don't block the MCP response
          const agentResult = await runAgentTask(agent, taskId, sessionId, description, session.projectPath);

          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                taskId, state: agentResult.success ? "completed" : "failed",
                description, assignedTo: agent.name,
                success: agentResult.success,
                output: agentResult.output?.slice(0, 2000),
                duration: agentResult.duration,
                error: agentResult.error || null,
                message: agentResult.success
                  ? `${agent.name} completed the task via CLI`
                  : `${agent.name} failed: ${agentResult.error}`,
              }, null, 2),
            }],
          };
        }
      }

      // Auto-route based on task description
      const route = routeTask(description, session.agents);

      if (route.target === "agent" && route.agentId) {
        const agent = getAgent(route.agentId);
        if (agent) {
          const routedResult = await runAgentTask(agent, taskId, sessionId, description, session.projectPath);

          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                taskId, state: routedResult.success ? "completed" : "failed",
                description, assignedTo: agent.name,
                confidence: route.confidence,
                reasoning: route.reasoning,
                success: routedResult.success,
                output: routedResult.output?.slice(0, 2000),
                duration: routedResult.duration,
                error: routedResult.error || null,
                message: routedResult.success
                  ? `${agent.name} completed (${route.confidence}% confidence match)`
                  : `${agent.name} failed: ${routedResult.error}`,
              }, null, 2),
            }],
          };
        }
      }

      // Fall back to direct CLI execution (no agent)
      const model = resolveModel();
      const effort = resolveEffort();
      const mode = resolveSpawnMode();

      const cliResult = await spawnTask({
        taskId, agentName: "CLI Worker", taskDescription: description,
        provider: "claude-code", cwd: session.projectPath, mode,
        model, effort,
      });

      updateTaskState(taskId, cliResult.success ? "completed" : "failed", JSON.stringify(cliResult));

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            taskId, state: cliResult.success ? "completed" : "failed",
            description, assignedTo: "CLI Worker (direct)",
            confidence: route.confidence,
            reasoning: route.reasoning,
            success: cliResult.success,
            output: cliResult.output?.slice(0, 2000),
            duration: cliResult.duration,
            error: cliResult.error || null,
            message: cliResult.success
              ? "CLI worker completed the task"
              : `CLI worker failed: ${cliResult.error}`,
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "quick_task",
    "The easiest way to use Cerebro — just describe what you want built or fixed. Auto-creates a session, picks the right CLI provider, and executes. Use this when the user says things like 'build me a website' or 'fix this bug' or 'review this code' without specifying sessions or agents. If no projectPath is given, ask the user where to save files.",
    {
      task: z.string().describe("What to build, fix, or do — in plain natural language"),
      projectPath: z.string().optional().describe("Where to save files (e.g., ~/Projects/my-app). If omitted, Cerebro will use a default."),
      provider: z.string().optional().describe("CLI provider to use: 'claude-code', 'codex', 'aider'. Defaults to claude-code."),
      model: z.string().optional().describe("Model to use: 'sonnet', 'opus', 'haiku'. Defaults to sonnet."),
    },
    async ({ task, projectPath, provider, model }) => {
      const { homedir } = await import("node:os");
      const { existsSync, mkdirSync } = await import("node:fs");
      const { runAgentTask } = await import("./agents/agent-runner.js");
      const { resolveModel, resolveEffort, resolveSpawnMode } = await import("./workers/model-config.js");

      // Auto-detect provider from task description
      let resolvedProvider = (provider as any) || "claude-code";
      const taskLower = task.toLowerCase();
      if (!provider) {
        if (taskLower.includes("codex") || taskLower.includes("openai")) resolvedProvider = "codex";
        else if (taskLower.includes("aider")) resolvedProvider = "aider";
      }

      // Auto-detect model from task description
      let resolvedModel = model || "sonnet";
      if (!model) {
        if (taskLower.includes("opus")) resolvedModel = "opus";
        else if (taskLower.includes("haiku")) resolvedModel = "haiku";
      }

      // Resolve project path
      const home = homedir();
      const resolvedPath = projectPath
        ? projectPath.replace(/^~/, home)
        : `${home}/Projects/cerebro-workspace`;

      if (!existsSync(resolvedPath)) {
        try {
          mkdirSync(resolvedPath, { recursive: true });
        } catch {
          return {
            content: [{ type: "text", text: "Could not create directory. Please specify a writable folder path, e.g. ~/Projects/my-app" }],
            isError: true,
          };
        }
      }

      // Auto-create a session
      const session = createNewSession(resolvedPath);

      // Create a temporary agent for this task
      const { saveAgent } = await import("./session/store.js");
      const agentId = uuidv4();
      const agentName = "Quick Worker";
      const now = new Date().toISOString();
      const agentDef = {
        agentId,
        name: agentName,
        description: "Auto-created agent for quick task execution",
        createdAt: now,
        createdBy: "conversation" as const,
        persona: "You are a skilled developer. Complete the task efficiently and save all files in the working directory.",
        tools: [] as string[],
        preferences: { learned: {} },
        chainTriggers: { onComplete: null, onError: null },
        source: { tier: "user" as const, skillRef: null },
        a2a: {
          agentCardUrl: "",
          endpoint: "",
          supportedModalities: ["text"],
          skills: [],
          taskLifecycle: false,
        },
        version: "1.0.0",
      };
      saveAgent(session.id, agentDef);

      // Execute
      const result = await runAgentTask(
        agentDef,
        uuidv4(),
        session.id,
        task,
        resolvedPath,
        { provider: resolvedProvider as any, model: resolvedModel, mode: resolveSpawnMode() }
      );

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            sessionId: session.id,
            projectPath: resolvedPath,
            provider: resolvedProvider,
            model: resolvedModel,
            success: result.success,
            output: result.output?.slice(0, 3000),
            duration: result.duration,
            error: result.error || null,
            message: result.success
              ? `Task completed! Files saved to ${resolvedPath}`
              : `Task failed: ${result.error}`,
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "read_project",
    "Read the project folder structure and file contents. Use this to understand a codebase before making changes. Returns directory tree and optionally file contents for specified files or all files.",
    {
      sessionId: z.string().describe("Session ID"),
      path: z.string().optional().describe("Specific file or subdirectory to read. If omitted, reads the project root."),
      includeContents: z.boolean().optional().describe("If true, also read file contents (not just listing). Default: false for directories, true for individual files."),
      maxDepth: z.number().optional().describe("Max directory depth to scan. Default: 3"),
      filePattern: z.string().optional().describe("Glob pattern to filter files, e.g. '*.ts' or '*.py'. Default: all files."),
    },
    async ({ sessionId, path, includeContents, maxDepth, filePattern }) => {
      const session = getSession(sessionId);
      if (!session) {
        return { content: [{ type: "text", text: "Session not found" }], isError: true };
      }

      const { readdirSync, readFileSync, statSync } = await import("node:fs");
      const { join, relative, extname } = await import("node:path");

      const rootPath = session.projectPath;
      const targetPath = path ? join(rootPath, path) : rootPath;
      const depth = maxDepth || 3;

      // Check if target is a file
      try {
        const stat = statSync(targetPath);
        if (stat.isFile()) {
          const content = readFileSync(targetPath, "utf-8");
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                file: relative(rootPath, targetPath),
                size: stat.size,
                content: content.slice(0, 50000),
                truncated: content.length > 50000,
              }, null, 2),
            }],
          };
        }
      } catch { /* target might not exist */ }

      // Scan directory tree
      const IGNORE = new Set(["node_modules", ".git", "build", "dist", ".cerebro", ".next", "coverage", "__pycache__"]);
      const BINARY_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".ico", ".woff", ".woff2", ".ttf", ".eot", ".map", ".lock"]);

      interface FileEntry {
        path: string;
        size: number;
        content?: string;
      }

      const files: FileEntry[] = [];

      function scanDir(dir: string, currentDepth: number): void {
        if (currentDepth > depth) return;
        try {
          const entries = readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.name.startsWith(".") && entry.name !== ".env.example") continue;
            if (IGNORE.has(entry.name)) continue;

            const fullPath = join(dir, entry.name);
            const relPath = relative(rootPath, fullPath);

            if (entry.isDirectory()) {
              files.push({ path: relPath + "/", size: 0 });
              scanDir(fullPath, currentDepth + 1);
            } else if (entry.isFile()) {
              const ext = extname(entry.name);
              if (filePattern && !entry.name.match(new RegExp(filePattern.replace("*", ".*")))) continue;

              const stat = statSync(fullPath);
              const fileEntry: FileEntry = { path: relPath, size: stat.size };

              if (includeContents && !BINARY_EXTS.has(ext) && stat.size < 100000) {
                try {
                  fileEntry.content = readFileSync(fullPath, "utf-8");
                } catch { /* skip unreadable files */ }
              }

              files.push(fileEntry);
            }
          }
        } catch { /* skip unreadable dirs */ }
      }

      scanDir(targetPath, 0);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            projectPath: rootPath,
            scannedPath: relative(rootPath, targetPath) || ".",
            totalFiles: files.filter(f => !f.path.endsWith("/")).length,
            totalDirs: files.filter(f => f.path.endsWith("/")).length,
            files,
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "get_status",
    "Get current project progress and task status",
    { sessionId: z.string().describe("Session ID") },
    async ({ sessionId }) => {
      const session = getSession(sessionId);
      if (!session) {
        return { content: [{ type: "text", text: "Session not found" }], isError: true };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                state: session.state,
                pendingTasks: session.taskQueue.length,
                completedTasks: session.completedTasks.length,
                agents: session.agents.map((a) => a.name),
                lastActive: session.lastActive,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "review_code",
    "Get a human-friendly explanation of code changes",
    {
      sessionId: z.string().describe("Session ID"),
      filePath: z.string().optional().describe("Specific file to review"),
    },
    async ({ sessionId, filePath }) => {
      // TODO: Phase 2 — read file via CLI worker and summarize
      return {
        content: [
          {
            type: "text",
            text: `Code review requested for session ${sessionId}${filePath ? `, file: ${filePath}` : ""}. CLI worker integration needed.`,
          },
        ],
      };
    }
  );

  server.tool(
    "run_build",
    "Trigger a project build and return results",
    { sessionId: z.string().describe("Session ID") },
    async ({ sessionId }) => {
      // TODO: Phase 2 — execute build via CLI worker
      return {
        content: [
          { type: "text", text: `Build triggered for session ${sessionId}. CLI worker integration needed.` },
        ],
      };
    }
  );

  server.tool(
    "run_tests",
    "Run the test suite and return results",
    { sessionId: z.string().describe("Session ID") },
    async ({ sessionId }) => {
      // TODO: Phase 2 — execute tests via CLI worker
      return {
        content: [
          { type: "text", text: `Tests triggered for session ${sessionId}. CLI worker integration needed.` },
        ],
      };
    }
  );

  // ─── Agent Swarm Tools ───────────────────────────────────────

  server.tool(
    "create_agent",
    "Define a new specialist agent via natural language description",
    {
      sessionId: z.string().describe("Session ID"),
      name: z.string().describe("Agent name (e.g., 'Marketing Agent')"),
      description: z.string().describe("What this agent does"),
      persona: z.string().optional().describe("Detailed persona/instructions for the agent"),
      tools: z.array(z.string()).optional().describe("Tools this agent can use"),
    },
    async ({ sessionId, name, description, persona, tools }) => {
      const { saveAgent } = await import("./session/store.js");
      const agentId = uuidv4();
      const now = new Date().toISOString();

      const agent = {
        agentId,
        name,
        description,
        createdAt: now,
        createdBy: "conversation" as const,
        persona: persona || `You are a ${name}. ${description}`,
        tools: tools || [],
        preferences: { learned: {} },
        chainTriggers: { onComplete: null, onError: null },
        source: { tier: "user" as const, skillRef: null },
        a2a: {
          agentCardUrl: `/.well-known/agent-card/${agentId}.json`,
          endpoint: `http://localhost:3000/a2a/${agentId}`,
          supportedModalities: ["text"],
          skills: [],
          taskLifecycle: true,
        },
        version: "1.0.0",
      };

      saveAgent(sessionId, agent);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { agentId, name, description, message: `${name} created and added to your swarm.` },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "list_agents",
    "Show all agents in the current session with their status",
    { sessionId: z.string().describe("Session ID") },
    async ({ sessionId }) => {
      const session = getSession(sessionId);
      if (!session) {
        return { content: [{ type: "text", text: "Session not found" }], isError: true };
      }

      const { getHeartbeats } = await import("./session/store.js");
      const heartbeats = getHeartbeats();
      const heartbeatMap = new Map(heartbeats.map((h) => [h.agentId, h]));

      const agents = session.agents.map((a) => {
        const hb = heartbeatMap.get(a.agentId);
        return {
          agentId: a.agentId,
          name: a.name,
          description: a.description,
          status: hb?.status || "offline",
          currentTask: hb?.taskDescription || null,
          createdBy: a.createdBy,
        };
      });

      return {
        content: [{ type: "text", text: JSON.stringify(agents, null, 2) }],
      };
    }
  );

  server.tool(
    "update_agent",
    "Modify an existing agent's definition, skills, or preferences",
    {
      agentId: z.string().describe("Agent ID to update"),
      sessionId: z.string().describe("Session ID"),
      name: z.string().optional().describe("New name"),
      description: z.string().optional().describe("New description"),
      persona: z.string().optional().describe("New persona"),
      tools: z.array(z.string()).optional().describe("New tool list"),
    },
    async ({ agentId, sessionId, name, description, persona, tools }) => {
      const { getAgent, saveAgent } = await import("./session/store.js");
      const existing = getAgent(agentId);
      if (!existing) {
        return { content: [{ type: "text", text: "Agent not found" }], isError: true };
      }

      const updated = {
        ...existing,
        name: name || existing.name,
        description: description || existing.description,
        persona: persona || existing.persona,
        tools: tools || existing.tools,
      };
      saveAgent(sessionId, updated);

      return {
        content: [
          { type: "text", text: `${updated.name} updated successfully.` },
        ],
      };
    }
  );

  server.tool(
    "remove_agent",
    "Delete an agent from the swarm",
    { agentId: z.string().describe("Agent ID to remove") },
    async ({ agentId }) => {
      const { deleteAgent, getAgent } = await import("./session/store.js");
      const agent = getAgent(agentId);
      if (!agent) {
        return { content: [{ type: "text", text: "Agent not found" }], isError: true };
      }
      deleteAgent(agentId);
      return {
        content: [{ type: "text", text: `${agent.name} removed from swarm.` }],
      };
    }
  );

  server.tool(
    "get_agent_status",
    "Get detailed status and history for a specific agent",
    { agentId: z.string().describe("Agent ID") },
    async ({ agentId }) => {
      const { getAgent, getHeartbeats, getMessagesForAgent } = await import("./session/store.js");
      const agent = getAgent(agentId);
      if (!agent) {
        return { content: [{ type: "text", text: "Agent not found" }], isError: true };
      }

      const heartbeats = getHeartbeats();
      const hb = heartbeats.find((h) => h.agentId === agentId);
      const messages = getMessagesForAgent(agentId);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                agent: { name: agent.name, description: agent.description, createdBy: agent.createdBy },
                status: hb?.status || "offline",
                currentTask: hb?.taskDescription || null,
                recentMessages: messages.slice(0, 10).map((m) => ({
                  from: m.fromAgentId,
                  content: m.content,
                  hash: m.hash,
                  time: m.timestamp,
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "install_agent_pack",
    "Install pre-built agent templates from the marketplace",
    {
      packName: z.string().describe("Pack name (e.g., 'web-app', 'api-service', 'content-site')"),
      sessionId: z.string().describe("Session ID"),
    },
    async ({ packName, sessionId }) => {
      // TODO: Phase 3 — load from starter-kits/ directory
      return {
        content: [
          {
            type: "text",
            text: `Agent pack '${packName}' installation requested for session ${sessionId}. Marketplace integration needed.`,
          },
        ],
      };
    }
  );

  server.tool(
    "delegate_to_agent",
    "Explicitly route a task to a specific agent, overriding auto-routing",
    {
      sessionId: z.string().describe("Session ID"),
      agentId: z.string().describe("Target agent ID"),
      task: z.string().describe("Task description"),
    },
    async ({ sessionId, agentId, task }) => {
      const { getAgent } = await import("./session/store.js");
      const agent = getAgent(agentId);
      if (!agent) {
        return { content: [{ type: "text", text: "Agent not found" }], isError: true };
      }

      const taskId = uuidv4();
      createTask(sessionId, {
        id: taskId,
        description: task,
        state: "submitted",
        assignedTo: agent.name,
        agentId: agentId,
        createdAt: new Date().toISOString(),
        completedAt: null,
        result: null,
        threadId: uuidv4(),
        parentTaskId: null,
      });

      // Get session for project path
      const delegateSession = getSession(sessionId);
      const projectPath = delegateSession?.projectPath || process.cwd();

      // Execute the task — spawns a visible Terminal window
      const { runAgentTask } = await import("./agents/agent-runner.js");
      const result = await runAgentTask(agent, taskId, sessionId, task, projectPath);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                taskId,
                delegatedTo: agent.name,
                state: result.success ? "completed" : "failed",
                success: result.success,
                output: result.output?.slice(0, 2000),
                duration: result.duration,
                error: result.error || null,
                message: result.success
                  ? `${agent.name} completed the task successfully`
                  : `${agent.name} encountered an error: ${result.error}`,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ─── Vision Tools ────────────────────────────────────────────

  server.tool(
    "analyze_image",
    "Interpret an image and suggest actions based on its content",
    {
      imageData: z.string().describe("Base64-encoded image data"),
      context: z.string().optional().describe("Additional context about the image"),
    },
    async ({ imageData, context }) => {
      // TODO: Phase 5 — pass to Claude Vision API
      return {
        content: [
          {
            type: "text",
            text: `Image received (${imageData.length} chars). Vision pipeline integration needed.${context ? ` Context: ${context}` : ""}`,
          },
        ],
      };
    }
  );

  server.tool(
    "implement_from_image",
    "Build or fix code based on image content (screenshot, mockup, error)",
    {
      sessionId: z.string().describe("Session ID"),
      imageData: z.string().describe("Base64-encoded image data"),
      instruction: z.string().optional().describe("What to do with the image"),
    },
    async ({ sessionId, imageData, instruction }) => {
      // TODO: Phase 5 — vision → decomposer → CLI worker
      return {
        content: [
          {
            type: "text",
            text: `Implementation from image requested for session ${sessionId}. Vision + CLI integration needed.`,
          },
        ],
      };
    }
  );

  server.tool(
    "compare_screenshots",
    "Visual diff between expected and actual screenshots",
    {
      expected: z.string().describe("Base64-encoded expected screenshot"),
      actual: z.string().describe("Base64-encoded actual screenshot"),
    },
    async ({ expected, actual }) => {
      // TODO: Phase 5 — vision comparison
      return {
        content: [
          { type: "text", text: "Screenshot comparison requested. Vision pipeline integration needed." },
        ],
      };
    }
  );

  // ─── Handover Tools ──────────────────────────────────────────

  server.tool(
    "prepare_handover",
    "Generate a signed handover token for session continuity across chats",
    { sessionId: z.string().describe("Session ID") },
    async ({ sessionId }) => {
      const token = prepareHandoverToken(sessionId);
      if (!token) {
        return { content: [{ type: "text", text: "Session not found" }], isError: true };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                token,
                instructions: "Copy this token and paste it in a new chat with 'resume_session' to continue.",
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "validate_token",
    "Check if a handover token is valid",
    { token: z.string().describe("Base64url-encoded token to validate") },
    async ({ token }) => {
      try {
        const { deserializeToken } = await import("./session/token.js");
        const { validateToken } = await import("./session/token.js");
        const parsed = deserializeToken(token);
        const result = validateToken(parsed);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { valid: result.valid, sessionId: parsed.sessionId, error: result.error || null },
                null,
                2
              ),
            },
          ],
        };
      } catch {
        return {
          content: [{ type: "text", text: "Invalid token format" }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "get_context_health",
    "Report current context window usage and handover readiness",
    { sessionId: z.string().describe("Session ID") },
    async ({ sessionId }) => {
      // TODO: Phase 5 — actual context tracking
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                estimatedUsage: 0,
                estimatedRemaining: 100,
                warningLevel: "none",
                shouldHandover: false,
                handoverReady: false,
                message: "Context health monitoring — full implementation in Phase 5",
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ─── Worker Configuration Tools ──────────────────────────────

  server.tool(
    "configure_workers",
    "Configure which CLI tools handle which tasks. Say 'Use Claude for coding and Codex for testing' or 'Set Aider as default'",
    {
      instruction: z.string().describe("Natural language routing config, e.g. 'Use Claude for coding, Codex for testing'"),
    },
    async ({ instruction }) => {
      const { parseRoutingConfig, setRoutingRule, setDefaultProvider, getRoutingRules, getDefaultProvider } = await import("./workers/pool.js");

      const parsed = parseRoutingConfig(instruction);

      for (const rule of parsed.rules) {
        setRoutingRule(rule.taskCategory, rule.provider, rule.priority);
      }

      if (parsed.defaultProvider) {
        setDefaultProvider(parsed.defaultProvider);
      }

      const currentRules = getRoutingRules();
      const currentDefault = getDefaultProvider();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                message: "Worker routing updated",
                defaultProvider: currentDefault,
                rules: currentRules.map((r) => `${r.taskCategory} → ${r.provider}`),
                applied: parsed.rules.length,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "detect_providers",
    "Detect which CLI coding tools are installed and available on this system",
    {},
    async () => {
      const { detectAvailableProviders } = await import("./workers/cli-worker.js");

      const available = await detectAvailableProviders();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                available: available.map((p) => ({
                  name: p.provider,
                  binary: p.binary,
                  categories: p.taskCategories,
                })),
                total: available.length,
                message: available.length > 1
                  ? `Found ${available.length} CLI providers. Use configure_workers to set routing rules.`
                  : available.length === 1
                    ? `Found ${available[0].provider}. Install more CLI tools for multi-provider support.`
                    : "No CLI coding tools found. Install Claude Code CLI, Codex, or Aider.",
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "configure_model",
    "Set model, effort level, and terminal mode. Say 'Use Opus for coding' or 'Set high effort' or 'Run in background mode'",
    {
      instruction: z.string().describe("Natural language config, e.g. 'Use Opus with high effort' or 'Set background mode'"),
    },
    async ({ instruction }) => {
      const {
        parseModelConfig, setDefaultModel, setDefaultEffort, setDefaultSpawnMode,
        setProviderModel, setProviderEffort, setAgentModel, setAgentEffort,
        getModelConfig,
      } = await import("./workers/model-config.js");

      const parsed = parseModelConfig(instruction);

      if (parsed.model) {
        if (parsed.forProvider) {
          setProviderModel(parsed.forProvider, parsed.model);
        } else if (parsed.forAgent) {
          setAgentModel(parsed.forAgent, parsed.model);
        } else {
          setDefaultModel(parsed.model);
        }
      }

      if (parsed.effort) {
        if (parsed.forProvider) {
          setProviderEffort(parsed.forProvider, parsed.effort);
        } else if (parsed.forAgent) {
          setAgentEffort(parsed.forAgent, parsed.effort);
        } else {
          setDefaultEffort(parsed.effort);
        }
      }

      if (parsed.spawnMode) {
        setDefaultSpawnMode(parsed.spawnMode);
      }

      const config = getModelConfig();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                message: "Model configuration updated",
                defaultModel: config.defaultModel || "CLI default",
                defaultEffort: config.defaultEffort,
                spawnMode: config.defaultSpawnMode,
                perProvider: Object.keys(config.perProvider).length > 0 ? config.perProvider : "none",
                perAgent: Object.keys(config.perAgent).length > 0 ? config.perAgent : "none",
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  return server;
}
