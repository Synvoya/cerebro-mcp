# Agent Guide

## Creating Agents

Create agents by talking to Claude Chat with Cerebro connected:

```
"Add a marketing agent that writes social media posts in a casual tone"
"Create a QA agent that writes tests for React components"
"Add a DevOps agent for Docker and CI/CD"
```

Cerebro saves the agent definition with:
- A persona built from your description
- Auto-extracted skills for A2A Agent Card
- Default A2A configuration for interop

## Managing Agents

```
"Show me my agents"              → list_agents
"Update the Coder to use Python" → update_agent
"Remove the QA agent"            → remove_agent
"What is the Coder doing?"       → get_agent_status
```

## Agent-to-Agent Delegation

Agents delegate via A2A protocol. Set up chain triggers:

```
"When the Coder finishes, automatically send to QA for testing"
```

The delegation creates a threaded conversation between agents, with task lifecycle states (submitted → working → completed/failed).

## Agent Marketplace

### Tier 1: Anthropic Skills
Pre-built templates from Anthropic's open-source repo:
```
"Install the Coder agent template"
```

### Tier 2: Community
User-contributed agents shared on GitHub.

### Tier 3: User-Created
Your custom agents, private by default.

## Starter Kits

Drop `.cerebro/agents.json` in a project for auto-registration:

**web-app:** Coder + Designer + QA
**api-service:** Coder + QA + DevOps
**content-site:** Designer + Coder + Marketing

```
"Install the web-app starter kit"
```

## A2A Interop

Every Cerebro agent publishes an Agent Card. External A2A agents can join:

```
"Connect the Salesforce agent at salesforce.example.com"
```

Cerebro discovers the Agent Card, connects, and the external agent becomes part of your swarm.

## Agent Memory

Agents learn preferences over time:
- "This user prefers React over Vue"
- "Use TypeScript, not JavaScript"
- "Tailwind CSS for styling"

Preferences persist across sessions. Working context is wiped per task (zero rot).
