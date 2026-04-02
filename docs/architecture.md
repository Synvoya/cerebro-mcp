# Architecture

## Dual-Protocol Design

Cerebro MCP is the first orchestrator to unify both Linux Foundation AI communication standards:

- **MCP** (Model Context Protocol) — agent-to-tool communication
- **A2A** (Agent-to-Agent Protocol, v0.3) — agent-to-agent communication

This means Cerebro can talk to any tool (via MCP) and any agent (via A2A) using open standards.

## Seven-Layer Model

```
Layer 1: User (non-coder)
Layer 2: Claude Chat (brain) — plans, decomposes, delegates
Layer 3: Cerebro MCP Server (orchestrator) — routes, manages, monitors
Layer 4: Workers + Agent Swarm + External MCPs
Layer 5: Agent Marketplace + A2A Interop
Layer 6: A2A Discovery (Agent Cards)
Layer 7: Working Product
```

## Core Components

### Session Manager
SQLite-backed session lifecycle. Each session tracks: state, project hash, task queue, completed tasks, file manifest, and agent definitions. Sessions persist across chat handovers via HMAC-SHA256 signed tokens.

### Task Router
Keyword-based and agent-confidence-scored routing. Evaluates each task against available agents, calculates a confidence percentage, and routes to the best match. Falls back to CLI workers for unmatched tasks.

### Worker Pool
Manages fresh CLI worker instances per task. Workers are disposable — spawned, used, destroyed. Project state lives in the session store, not in any worker's context. This is the anti-context-rot architecture.

### Agent Swarm Manager
User-defined agents created via conversation. Each agent has: persona, tools, learned preferences, chain triggers, and A2A config. Agents persist across sessions but get fresh context per call.

### A2A Communication Layer
All agent-to-agent communication uses the A2A protocol. Internal delegation and external interop use the same standard. Every agent auto-generates an Agent Card for discovery.

### Heartbeat System
10-second polling for agent presence. Includes current task description so the dashboard shows what each agent is doing in real-time.

### Message Threading
Agent conversations are threaded with hash references, creating traceable dialogue chains between agents.

### Context Health Monitor
Tracks estimated context window consumption. Warns at 40% remaining, auto-prepares handover at 20%.

## Anti-Context-Rot Design

1. Fresh CLI worker per task — no accumulated stale context
2. Fresh context per agent call — definitions persist, working context wiped
3. State lives in SQLite, not in any LLM context window
4. Handover tokens serialize state for new chat sessions

## Data Flow

```
User message → Chat (LLM) → MCP tool call → Cerebro server
  → Task router evaluates agents (confidence scoring)
  → Best agent selected OR CLI worker spawned
  → Fresh context: agent persona + task only
  → Execute via Claude Code CLI subprocess
  → Result reporter translates output
  → Response to Chat → User sees plain language result
```

## Security

- Session tokens signed with HMAC-SHA256
- Constant-time signature comparison
- Configurable secret key via `CEREBRO_SECRET_KEY` environment variable
- SQLite stored in `~/.cerebro/cerebro.db`
