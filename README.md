# Cerebro MCP

**The brain that builds.**

Universal AI orchestrator — MCP for tools, A2A for agents. Chat thinks, agents specialize, CLI codes. One conversation, working software. No terminal required.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![npm](https://img.shields.io/npm/v/@synvoya/cerebro-mcp)](https://www.npmjs.com/package/@synvoya/cerebro-mcp)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

> **First orchestrator to unify MCP + A2A.** Both Linux Foundation standards. Tools speak MCP. Agents speak A2A. Cerebro orchestrates both.

[Live Demo](https://cerebro.synvoya.com) · [Architecture](docs/architecture.md) · [API Reference](docs/api-reference.md) · [Agent Guide](docs/agents-guide.md)

---

## The Problem

You have a great idea. You can describe it perfectly. But you can't build it because you don't know how to code.

Claude Chat can plan and brainstorm but can't write files. Claude Code CLI can build software but requires a terminal. Existing orchestrators target developers. **There's nothing for the 99% of people who think in ideas, not code.**

## The Solution

Cerebro MCP makes Claude Chat the **brain** that controls everything. You describe what you want in plain English. Cerebro decomposes your idea, routes tasks to specialist agents, spawns CLI workers, and reports back in language you understand.

```
You: "Build me a landing page for my coffee shop with online ordering"

Cerebro: Breaking this into tasks...
  → Designer agent: Creating layout with hero, menu grid, order CTA
  → Coder agent: Building responsive HTML/CSS with cart functionality  
  → QA agent: All 12 tests passing. Lighthouse score: 96.

Your landing page is ready at localhost:3000.
```

You never see a terminal. You never write code. You just talk.

## Quick Start

```bash
npx @synvoya/cerebro-mcp
```

Then add to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "cerebro": {
      "command": "npx",
      "args": ["@synvoya/cerebro-mcp"]
    }
  }
}
```

Restart Claude Desktop. Cerebro's 28 tools are now available in Chat.

## Just Talk — Zero Setup Mode

Don't want to learn tools? Just use `quick_task`:

```
You: "Build me a portfolio website in ~/Projects/my-portfolio"

Cerebro: Auto-creating session... picking Claude Code + Sonnet...
  → Terminal opens, Claude Code starts building
  → Task completed! Files saved to ~/Projects/my-portfolio
```

No sessions to create. No agents to configure. Just describe what you want and where to save it.

## What Makes Cerebro Different

|  | Remote Control | Other Orchestrators | **Cerebro MCP** |
| --- | --- | --- | --- |
| **For** | Developers | Developers | **Non-coders** |
| **Direction** | User → CLI | Dev → agents | **Chat → everything** |
| **Protocols** | MCP only | Custom | **MCP + A2A** |
| **Agent creation** | N/A | Config files | **Just talk** |
| **Context rot** | Not addressed | Manual clear | **Fresh per task** |
| **External agents** | N/A | N/A | **Any A2A agent joins** |
| **Session continuity** | Single session | N/A | **Signed tokens** |
| **CLI providers** | Claude Code only | Single provider | **Multi-provider** |
| **Zero setup** | N/A | Config required | **Just talk** |

## Architecture

```
User (non-coder)
  │ Natural language, images
  ▼
Claude Chat (brain)
  │ Plans, decomposes, delegates
  ▼
Cerebro MCP Server (orchestrator)
  │ MCP for tools │ A2A for agents
  ├─────────┼─────────┤
  ▼         ▼         ▼
CLI      Agent      External
Workers  Swarm      MCPs
  │         │         │
  ▼         ▼         ▼
Agent Marketplace + A2A Interop
  │
  ▼
Working Product
```

### Dual Protocol

Cerebro is the first orchestrator to implement both standards:

- **MCP** (Model Context Protocol) — how Cerebro talks to tools. CLI, databases, GitHub, Slack.
- **A2A** (Agent-to-Agent Protocol, v0.3) — how agents talk to each other. Internal delegation and external interop.

Both protocols live under the Linux Foundation.

## Features

### Agent Swarm — Build Your AI Team by Talking

Create specialist agents with natural language. No config files, no YAML.

```
You: "Add a marketing agent that writes social media posts in a casual tone"
Cerebro: Marketing agent created and added to your swarm.

You: "Write a launch tweet for the coffee shop"
Cerebro → Marketing agent: "your morning just got an upgrade. order your 
  favorite latte from the couch and pick it up hot."
```

Agents persist across sessions. They learn your preferences. They delegate to each other via A2A.

### Fresh Context — Zero Memory Rot

Every agent call gets a fresh context window. Agent definitions and learned preferences persist, but working context is wiped after each task. No stale reasoning accumulates. Ever.

### Multi-Provider CLI — Choose Your Tools

Cerebro isn't locked to a single CLI. Route different task types to different providers using natural language.

```
You: "Use Claude Code for coding tasks and Codex for code review"
Cerebro: Worker routing updated.
  → Coding tasks → Claude Code CLI
  → Code review → OpenAI Codex CLI

You: "What CLI tools do I have installed?"
Cerebro: Detected providers:
  ✓ Claude Code CLI (authenticated)
  ✓ Codex CLI v0.118.0 (authenticated)
  ✗ Aider (not installed)
```

Supported providers: **Claude Code**, **OpenAI Codex**, **Aider**, and any generic shell command. Cerebro auto-detects installed tools and intelligently routes tasks based on agent name, description, and routing rules.

### A2A Interop — Your Swarm Has No Walls

Every Cerebro agent is automatically A2A-compliant. They publish Agent Cards at `/.well-known/agent-card.json`. External A2A agents from Salesforce, SAP, LangChain, CrewAI — anything A2A-compliant — can join your swarm.

```
You: "Connect the Salesforce agent and update our CRM"
Cerebro: Discovering agent via Agent Card... connected.
  → Salesforce agent: Campaign created, catalog updated.
```

### Agent Marketplace — Three Tiers

1. **Anthropic Skills** — Curated templates from Anthropic's open-source repo (Apache 2.0)
2. **Community agents** — Shared by users, reviewed, tagged
3. **Your agents** — Created by you, private by default, optionally shareable

### Session Tokens — Survive Chat Handovers

When your chat hits context limits, Cerebro generates a signed handover token. Paste it in a new chat and continue exactly where you left off. Sessions, agents, task history — everything transfers.

### Starter Kits

Drop a `.cerebro/agents.json` in any project and agents auto-spawn on session start.

Built-in kits: `web-app` (Coder + Designer + QA), `api-service` (Coder + QA + DevOps), `content-site` (Designer + Coder + Marketing).

### Live Dashboard

Real-time agent status with heartbeats, task broadcasting, and conversation threading. See your AI team working like a project management board.

### Image Pipeline

Paste a screenshot, mockup, or error message. Cerebro interprets it via Claude Vision and converts it into actionable CLI instructions.

### Visible Terminals — Watch Your AI Work

Every task opens a real Terminal window so you can see exactly what's happening. The terminal shows the agent name, provider, model, and live CLI output as it runs. After completion, the terminal stays open for you to review.

Want the terminal to close automatically? Pass `autoCloseTerminal: true` when delegating tasks.

### Project Reader — AI Understands Your Code

Before making changes, Cerebro can read your entire project structure and file contents. The AI understands your codebase before touching it — no blind edits.

```
You: "Read my project and explain the architecture"
Cerebro: Scanning ~/Projects/my-app...
  → 42 files across 8 directories
  → TypeScript project with React frontend and Express backend...
```

## 28 MCP Tools

### Session Management
| Tool | What it does |
|------|-------------|
| `create_session` | Start a new project workspace. Tell it where to save files. |
| `resume_session` | Continue where you left off using a handover token. |
| `pause_session` | Park your session for later — everything is saved. |
| `end_session` | Finish and archive a session with all task history. |
| `list_sessions` | See all your active, paused, and recent sessions. |

### Task Execution
| Tool | What it does |
|------|-------------|
| `quick_task` | **The easiest way to use Cerebro.** Just say what you want — auto-creates session, picks provider, and builds. No setup needed. |
| `execute_task` | Run a task within an existing session. Auto-routes to the best agent. |
| `read_project` | Read your project's folder structure and file contents so the AI understands your codebase. |
| `get_status` | Check what's happening — see progress on all tasks. |
| `review_code` | Get a human-friendly explanation of code changes. |
| `run_build` | Trigger a build and see the results. |
| `run_tests` | Run your test suite and get a summary. |

### Agent Swarm
| Tool | What it does |
|------|-------------|
| `create_agent` | Create a specialist agent by describing what it should do. "Add a QA agent that reviews code for security issues." |
| `list_agents` | See all agents in your swarm with their status. |
| `update_agent` | Change an agent's persona, skills, or preferences. |
| `remove_agent` | Remove an agent from your swarm. |
| `get_agent_status` | Check what a specific agent is working on. |
| `install_agent_pack` | Install a pre-built team: `web-app`, `api-service`, or `content-site`. |
| `delegate_to_agent` | Send a task directly to a specific agent. Returns provider, model, and results. |

### Vision (Image Pipeline)
| Tool | What it does |
|------|-------------|
| `analyze_image` | Paste a screenshot or mockup — Cerebro interprets it and suggests actions. |
| `implement_from_image` | Turn a screenshot or design into working code. |
| `compare_screenshots` | Visual diff between expected and actual — find what changed. |

### Session Continuity
| Tool | What it does |
|------|-------------|
| `prepare_handover` | Generate a signed token to continue in a new chat window. |
| `validate_token` | Check if a handover token is still valid. |
| `get_context_health` | See how much context window remains before you need a handover. |

### Worker Configuration
| Tool | What it does |
|------|-------------|
| `configure_workers` | Route tasks to different CLI providers. "Use Codex for QA tasks." |
| `detect_providers` | See which CLI tools are installed on your system. |
| `configure_model` | Set the AI model and effort level. "Use Opus with high effort." |

## CLI Provider Setup

### Claude Code (recommended)

```bash
npm install -g @anthropic-ai/claude-code
claude-code auth
```

### OpenAI Codex

```bash
npm install -g @openai/codex
codex auth
```

Then in Chat:

```
You: "Use Codex for code review tasks"
Cerebro: Routing updated — code review tasks → Codex CLI.
```

### Aider

```bash
pip install aider-chat
```

Cerebro auto-detects all installed providers via `detect_providers`.

> **Note:** Cerebro automatically handles model compatibility between providers. If you configure Sonnet as your model, Cerebro will use it for Claude Code but skip it for Codex (which uses its own OpenAI models like gpt-5.4). No manual configuration needed.

## Project Structure

```
cerebro-mcp/
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # 28 MCP tools registered
│   ├── session/              # Session lifecycle + SQLite store
│   ├── router/               # Task routing + decomposition
│   ├── workers/              # CLI providers, terminal spawner,
│   │                         # model config, pool, Cowork (V2), MCP relay
│   ├── agents/               # Swarm, runner, confidence, delegation,
│   │                         # memory, marketplace, heartbeat, threading
│   ├── a2a/                  # A2A server, client, Agent Cards, lifecycle
│   ├── vision/               # Image relay + interpreter
│   ├── handover/             # Engine, context monitor, directory
│   ├── notifications/        # Webhooks + push alerts
│   ├── dashboard/            # Agent status dashboard
│   ├── security/             # HMAC-SHA256 crypto
│   ├── reporter/             # CLI output → human-friendly summaries
│   └── types/                # TypeScript type definitions
├── agents/                   # Built-in agent templates
├── starter-kits/             # Shareable .cerebro/ configs
└── tests/                    # Vitest test suite
```

## Development

```bash
git clone https://github.com/Synvoya/cerebro-mcp.git
cd cerebro-mcp
npm install
npm run build
npm test
```

**Current stats:** v0.2.0 · 69 files · ~6,500 lines of TypeScript · 28 MCP tools · 40/40 tests passing

## Roadmap

- [x] MCP server with 28 tools
- [x] Session management with signed tokens
- [x] Agent swarm with conversation-based CRUD
- [x] A2A protocol for agent-to-agent communication
- [x] Agent marketplace (3-tier)
- [x] Heartbeat presence + task broadcasting
- [x] Message threading between agents
- [x] Auto-registration via `.cerebro/agents.json`
- [x] Starter kits (web-app, api-service, content-site)
- [x] Claude Code CLI integration (subprocess management)
- [x] Multi-provider CLI (Claude Code, Codex, Aider, generic shell)
- [x] Quick task — zero-setup execution via natural language
- [x] Project reader — AI reads your codebase before making changes
- [x] Visible terminal spawner (branded agent windows)
- [x] Model and effort configuration via natural language
- [ ] Cowork integration (pending Anthropic API)
- [ ] Agent dashboard web UI
- [ ] Remote CLI workers (VPS/cloud)
- [ ] Community agent repository

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. No CLA required — contributions are licensed under Apache 2.0.

## License

Apache 2.0 — see [LICENSE](LICENSE). Copyright (c) 2026 Synvoya.

## Links

- **Website:** [cerebro.synvoya.com](https://cerebro.synvoya.com)
- **npm:** [@synvoya/cerebro-mcp](https://www.npmjs.com/package/@synvoya/cerebro-mcp)
- **GitHub:** [Synvoya/cerebro-mcp](https://github.com/Synvoya/cerebro-mcp)
- **Company:** [Synvoya](https://github.com/Synvoya)

---

*Built with passion by Hibi and the Synvoya team. The brain that builds.*
