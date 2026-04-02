# Changelog

All notable changes to Cerebro MCP will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
