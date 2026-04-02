# Cerebro MCP — Hackathon Submission Materials

## Hackathon Targets

| Hackathon | Deadline | Prize | Format | URL |
|-----------|----------|-------|--------|-----|
| aihackathon.dev (MCP_HACK//26) | April 17, 2026 | $5,000 (5 categories, $1K each) | Online, GitHub + submission form | https://aihackathon.dev/submission/ |
| MCP and A2A Hackathon (Devpost, AWS Edition) | In-person SF, check dates | $1,000+ per category | 3-min demo + Devpost | https://mcp-and-a2a-hackathon.devpost.com/ |
| Healthcare Agents (Devpost) | May 11, 2026 | $25,000 | Online, Devpost | https://devpost.com/c/artificial-intelligence |

---

## 3-Minute Demo Video Script

### [0:00–0:20] Hook

**Voiceover / Screen text:**
"What if you could build software by just talking? No terminal. No code. No developer experience needed."

**Screen:** Show a clean chat interface. User types: "Build me a landing page for my coffee shop"

### [0:20–0:50] The Problem

**Voiceover:**
"Today, AI can plan and brainstorm — but it can't execute. AI can write code — but it needs a developer to operate it. 99% of people with great ideas have no way to turn them into working software."

**Screen:** Quick split showing Claude Chat (can plan, can't build) vs Claude Code CLI (can build, needs developer)

### [0:50–1:30] The Solution — Cerebro in Action

**Voiceover:**
"Cerebro MCP changes this. It's a universal orchestrator that makes Chat the brain and CLI workers the hands. You talk. Cerebro builds."

**Screen:** Live demo flow:
1. User in Chat: "Create a session for my coffee shop project"
   → Cerebro creates session, shows ID
2. User: "Add a coding agent and a design agent"
   → Cerebro creates both agents, shows them in the swarm
3. User: "Build me a landing page with a hero section and online ordering"
   → Cerebro routes to Designer agent (confidence: 87%)
   → Designer delegates to Coder via A2A
   → Coder completes, delegates to QA
   → Task lifecycle: submitted → working → completed
4. User: "What's the status?"
   → Dashboard shows all agents, their tasks, completion status

### [1:30–2:10] What Makes It Different — Dual Protocol

**Voiceover:**
"Cerebro is the first orchestrator to unify both MCP and A2A — both Linux Foundation standards. MCP connects tools. A2A connects agents. No other project combines both."

**Screen:** Architecture diagram (the SVG we built) highlighting:
- MCP bus connecting CLI workers + external services
- A2A bus connecting agents to each other
- External A2A agents joining the swarm

**Voiceover:**
"Every agent you create is automatically A2A-compliant. External agents — from Salesforce, SAP, LangChain — can join your swarm. No lock-in. Full interop."

### [2:10–2:40] Key Features (rapid fire)

**Screen:** Feature cards appearing one by one:
- "Agent swarm — build your AI team by talking"
- "Fresh context per task — zero memory rot"
- "Session tokens — survive chat handovers"
- "Agent marketplace — Anthropic Skills + community"
- "Starter kits — .cerebro/agents.json auto-spawns"
- "Image pipeline — screenshot → fix"

### [2:40–3:00] Close

**Voiceover:**
"One command to install. Open source. Apache 2.0."

**Screen:** Terminal showing: `npx @synvoya/cerebro-mcp`

**Final screen:**
- "Cerebro MCP — The brain that builds"
- cerebro.synvoya.com
- github.com/Synvoya/cerebro-mcp
- @synvoya

---

## Submission Text — aihackathon.dev (MCP_HACK//26)

### Best Category: "Building Cool Agents" or "Real-World Production Showcases"

**Project Name:** Cerebro MCP

**Tagline:** The brain that builds — first MCP+A2A orchestrator for non-coders

**Description:**

Cerebro MCP is a universal AI orchestrator that lets anyone build software through conversation. No terminal, no code, no developer experience needed.

It implements 24 MCP tools that make Claude Chat the "brain" while CLI workers act as "hands." Users create specialist agents by talking — "Add a marketing agent that writes social media copy" — and Cerebro handles routing, delegation, and execution.

What makes Cerebro unique: it's the first orchestrator to unify both MCP (tool communication) and A2A (agent-to-agent communication) — both Linux Foundation standards — in a single system. Every agent is automatically A2A-compliant, meaning external agents from any A2A-compatible framework can join a Cerebro swarm. No lock-in.

Key innovations:
- Non-coder first: designed for people who can't use a terminal
- Dual-protocol: MCP for tools + A2A for agents
- Agent swarm: user-defined specialist agents via conversation
- Fresh context per task: anti-context-rot architecture
- Session tokens: cryptographically signed handover across chat limits
- Agent marketplace: 3-tier (Anthropic Skills + community + user-created)
- Agent heartbeats + task broadcasting: real-time swarm visibility
- Message threading between agents with hash references
- Auto-registration via .cerebro/agents.json

**GitHub:** https://github.com/Synvoya/cerebro-mcp
**Demo:** https://cerebro.synvoya.com
**Install:** `npx @synvoya/cerebro-mcp`

**Tech Stack:** TypeScript, MCP SDK, A2A Protocol v0.3, SQLite, Zod, Vitest

---

## Submission Text — Devpost (MCP and A2A Hackathon)

**Project Name:** Cerebro MCP — The brain that builds

**Short Description:** First orchestrator unifying MCP + A2A. Non-coders build software through conversation. Chat thinks, agents specialize, CLI codes.

**What it does:**
Cerebro MCP turns Claude Chat into a universal orchestrator. Users describe what they want in plain English. Cerebro decomposes the request, routes it to specialist agents (created by talking), and executes via CLI workers — all without the user seeing a terminal.

Agents communicate via Google's A2A protocol. When the Coder agent finishes, it delegates to QA via A2A with full task lifecycle tracking (submitted → working → completed). External A2A agents can join the swarm by publishing an Agent Card.

**How we built it:**
35 TypeScript source files implementing a full MCP server with 24 tools. SQLite for persistence. HMAC-SHA256 for session token signing. Agent confidence scoring for intelligent task routing. Heartbeat system with real-time presence. Message threading with hash references for traceable agent conversations.

**Challenges:**
Designing for non-coders while maintaining the power developers expect. Implementing A2A protocol compliance alongside MCP in a single server. Building an anti-context-rot architecture (fresh CLI workers per task, fresh context per agent call).

**What we learned:**
MCP and A2A are genuinely complementary — MCP handles agent-to-tool, A2A handles agent-to-agent. Unifying both in one system creates something neither can do alone. The agent marketplace concept (Anthropic Skills as Tier 1) provides a trusted starting point that bootstraps the swarm for new users.

**Built with:** TypeScript, MCP SDK, A2A Protocol, SQLite, Node.js, Zod, Vitest

**Links:**
- GitHub: https://github.com/Synvoya/cerebro-mcp
- Demo: https://cerebro.synvoya.com
- npm: @synvoya/cerebro-mcp

---

## Submission Text — Healthcare Agents (Devpost, May 11)

**Project Name:** Cerebro MCP — AI Agent Orchestrator for Healthcare Workflows

**Short Description:** Universal MCP+A2A orchestrator enabling non-technical healthcare staff to build automated workflows through conversation. FHIR-compatible via external MCP servers.

**What it does:**
Cerebro MCP enables healthcare administrators, nurses, and clinic managers to automate complex workflows without coding. Using natural conversation, users create specialist agents — a "Patient Intake Agent", a "Scheduling Agent", a "Records Agent" — that communicate via Google's A2A protocol.

Example workflow: A clinic manager says "When a new patient form comes in, extract the data, check insurance eligibility, and schedule their first appointment." Cerebro creates agents for each step, chains them via A2A delegation, and connects to FHIR-compliant systems via external MCP servers.

The A2A interop layer means hospital systems using Salesforce Health Cloud, Epic, or any A2A-compliant agent can connect directly to a Cerebro swarm — no custom integration required.

**Healthcare-specific value:**
- Non-technical staff can automate workflows (no IT dependency)
- A2A interop connects to existing health IT agents
- Fresh context per task ensures patient data isn't leaked between sessions
- Session tokens enable handover between shifts
- Agent marketplace could include pre-built healthcare agent templates

**Built with:** TypeScript, MCP SDK, A2A Protocol v0.3, SQLite, FHIR (via MCP), Zod

---

## Additional Hackathon Search — More Options

Look for these upcoming events:
- mcphackathon.com — aggregator for MCP hackathons
- devpost.com/hackathons (filter: AI, MCP)
- LabLab.ai — regular AI agent hackathons
- Anthropic community events — check Discord
- GitLab AI Hackathon 2026 — $65,000 in prizes (if still open)
- ZerveHack AI Hackathon — $10,000 in prizes, deadline April 29
- Gemini Live Agent Challenge — up to $25,000
