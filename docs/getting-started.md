# Getting Started with Cerebro MCP

## Prerequisites

- **Node.js 18+** — [Download](https://nodejs.org)
- **Claude Desktop** — [Download](https://claude.ai/download)
- **Claude Code CLI** (optional) — for full code execution capabilities

## Installation

### Option 1: npx (recommended)

```bash
npx @synvoya/cerebro-mcp
```

### Option 2: Global install

```bash
npm install -g @synvoya/cerebro-mcp
cerebro-mcp
```

## Connecting to Claude Desktop

Add Cerebro to your Claude Desktop configuration:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

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

Restart Claude Desktop. You should see Cerebro's tools available in Chat.

## Your First Session

1. **Create a session:** Tell Claude "Create a new Cerebro session for my project at ~/my-project"
2. **Create an agent:** "Add a coding agent that uses React and TypeScript"
3. **Give it a task:** "Build me a landing page with a hero section and contact form"
4. **Check status:** "What's the status of my project?"

## Using Starter Kits

If your project has a `.cerebro/agents.json` file, agents auto-register on session start.

Create one:

```json
{
  "agents": [
    {
      "name": "Coder",
      "description": "Full-stack developer using React and TypeScript",
      "persona": "You are a senior developer...",
      "tools": ["write_file", "run_build", "run_tests"]
    }
  ]
}
```

Or use a built-in kit: "Install the web-app starter kit"

## Session Continuity

When your chat gets long, Cerebro can generate a handover token:

1. "Prepare a handover for this session"
2. Copy the token
3. Open a new chat
4. "Resume session with this token: [paste token]"

Everything transfers — session state, agents, task history.

## Next Steps

- Read the [Architecture](architecture.md) doc for the full system design
- Check the [API Reference](api-reference.md) for all 24 tools
- See the [Agent Guide](agents-guide.md) for creating and managing agents
