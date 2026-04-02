// Copyright (c) 2026 Synvoya. Apache-2.0 License.

import type {
  RouteDecision,
  AgentDefinition,
  DecomposedStep,
} from "../types/index.js";

const CODE_KEYWORDS = [
  "build", "code", "create", "implement", "fix", "bug", "test", "deploy",
  "install", "run", "compile", "refactor", "debug", "write", "develop",
  "html", "css", "javascript", "typescript", "python", "react", "api",
  "database", "server", "endpoint", "component", "function", "class",
  "git", "commit", "push", "pull", "merge", "branch",
];

const FILE_KEYWORDS = [
  "document", "presentation", "spreadsheet", "docx", "pptx", "xlsx",
  "pdf", "report", "slide", "memo", "letter", "invoice",
];

const MCP_KEYWORDS = [
  "github", "slack", "database", "email", "calendar", "jira", "notion",
  "trello", "discord", "webhook", "api call", "external",
];

export function routeTask(
  description: string,
  agents: AgentDefinition[]
): RouteDecision {
  const lower = description.toLowerCase();

  // Check agent matches first — confidence scoring
  if (agents.length > 0) {
    const agentScores = agents.map((agent) => ({
      agent,
      score: calculateAgentConfidence(lower, agent),
    }));

    agentScores.sort((a, b) => b.score - a.score);
    const best = agentScores[0];

    if (best.score >= 0.4) {
      return {
        target: "agent",
        agentId: best.agent.agentId,
        confidence: Math.round(best.score * 100),
        reasoning: `Matched "${best.agent.name}" — ${best.agent.description}`,
        decomposedSteps: [
          {
            order: 1,
            description,
            target: "agent",
            agentId: best.agent.agentId,
            dependsOn: [],
          },
        ],
      };
    }
  }

  // Fall back to keyword-based routing
  const codeScore = scoreKeywords(lower, CODE_KEYWORDS);
  const fileScore = scoreKeywords(lower, FILE_KEYWORDS);
  const mcpScore = scoreKeywords(lower, MCP_KEYWORDS);

  if (mcpScore > codeScore && mcpScore > fileScore) {
    return {
      target: "mcp",
      agentId: null,
      confidence: Math.round(Math.min(mcpScore * 100, 95)),
      reasoning: "Task involves external service integration",
      decomposedSteps: [
        { order: 1, description, target: "mcp", agentId: null, dependsOn: [] },
      ],
    };
  }

  // CLI handles both code AND file creation in V1
  return {
    target: "cli",
    agentId: null,
    confidence: Math.round(Math.min(Math.max(codeScore, fileScore, 0.5) * 100, 95)),
    reasoning: fileScore > codeScore
      ? "Task involves file/document creation — routing to CLI worker"
      : "Task involves code/build operations — routing to CLI worker",
    decomposedSteps: [
      { order: 1, description, target: "cli", agentId: null, dependsOn: [] },
    ],
  };
}

function calculateAgentConfidence(
  taskLower: string,
  agent: AgentDefinition
): number {
  let score = 0;
  const agentWords = [
    agent.name.toLowerCase(),
    agent.description.toLowerCase(),
    ...agent.tools.map((t) => t.toLowerCase()),
    ...(agent.a2a.skills || []).map((s) => s.toLowerCase()),
  ].join(" ");

  // Name match is strong signal
  if (taskLower.includes(agent.name.toLowerCase())) {
    score += 0.5;
  }

  // Description word overlap
  const descWords = agent.description.toLowerCase().split(/\s+/);
  const taskWords = taskLower.split(/\s+/);
  const overlap = taskWords.filter((w) => descWords.includes(w) && w.length > 3);
  score += Math.min(overlap.length * 0.1, 0.3);

  // Skill match
  for (const skill of agent.a2a.skills || []) {
    if (taskLower.includes(skill.toLowerCase())) {
      score += 0.2;
    }
  }

  // Tool relevance
  for (const tool of agent.tools) {
    if (taskLower.includes(tool.toLowerCase())) {
      score += 0.1;
    }
  }

  return Math.min(score, 1.0);
}

function scoreKeywords(text: string, keywords: string[]): number {
  let matches = 0;
  for (const kw of keywords) {
    if (text.includes(kw)) matches++;
  }
  return Math.min(matches / 3, 1.0);
}
