# Changelog

All notable changes to Cerebro MCP will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] — 2026-04-15

### Added — Context Watcher
Real-time token usage tracking for Chat sessions via a persistent terminal dashboard.

- **start_context_watcher** — Opens a live terminal showing token usage, progress bar, warning levels, and handover recommendations
- **stop_context_watcher** — Closes the dashboard, preserves tracking data
- Tool call middleware that automatically tracks all 30 tools
- Per-tool token cost estimates (input + output)
- Conversation overhead estimation (system prompt, tool definitions, per-turn cost)
- Color-coded warning levels: green (healthy), yellow (50%), orange (70%), red (85%+)
- Estimated remaining calls counter
- macOS Terminal.app and Linux gnome-terminal/xterm support

### New Files
- src/context-watcher/tracker.ts — Token estimation engine
- src/context-watcher/terminal.ts — Persistent terminal dashboard
- src/context-watcher/index.ts — Barrel exports

### Changed
- server.ts — Added context-watcher import, middleware wrapper, 2 new tools (28 → 30)
- package.json — Version bump to 2.2.0

## [0.1.0] - 2026-03-30

### Added

- MCP server with 24 registered tools (session, task, agent, vision, handover)
- Session management with HMAC-SHA256 signed tokens
- SQLite persistence for sessions, tasks, agents, heartbeats, messages
- Agent swarm system with conversation-based CRUD
- Agent confidence scoring for intelligent task routing
- Agent-to-agent delegation via A2A protocol
- A2A server and client for internal + external agent communication
- Agent Card generation for A2A discovery
- A2A task lifecycle tracking (submitted → working → completed/failed)
- Agent heartbeat system with real-time presence
- Task description broadcasting to swarm dashboard
- Message threading between agents with hash references
- Agent memory/learning (per-agent preferences persist)
- Auto-registration from `.cerebro/agents.json` project configs
- Three-tier agent marketplace (Anthropic Skills, community, user-created)
- Built-in agent templates (Coder, Designer, Marketing, QA)
- Starter kits for web-app, api-service, content-site
- Task router with keyword and agent-based routing
- Task decomposer for multi-step breakdowns
- Worker pool with fresh-context-per-task (anti-context-rot)
- CLI worker with subprocess execution and Claude Code CLI support
- External MCP server relay (structure ready)
- Cowork worker placeholder (V2, pending Anthropic API)
- Image relay and vision interpreter
- Handover engine with signed tokens and directory-based auto-handover
- Context health monitoring with configurable warning thresholds
- Notification service with webhook support
- Agent status dashboard with formatted output
- Result reporter with error summarization for non-coders
- Build and test output parsers
