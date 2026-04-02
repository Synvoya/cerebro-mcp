// Copyright (c) 2026 Synvoya. Apache-2.0 License.

import type { AgentDefinition } from "../types/index.js";

export interface ConfidenceResult {
  agentId: string;
  agentName: string;
  score: number;
  reasoning: string;
}

/**
 * Score all agents against a task and return ranked results.
 */
export function rankAgents(
  task: string,
  agents: AgentDefinition[]
): ConfidenceResult[] {
  if (agents.length === 0) return [];

  const results = agents.map((agent) => scoreAgent(task, agent));
  results.sort((a, b) => b.score - a.score);
  return results;
}

/**
 * Find the best agent for a task. Returns null if no agent scores above threshold.
 */
export function findBestAgent(
  task: string,
  agents: AgentDefinition[],
  threshold = 0.3
): ConfidenceResult | null {
  const ranked = rankAgents(task, agents);
  if (ranked.length === 0) return null;
  return ranked[0].score >= threshold ? ranked[0] : null;
}

function scoreAgent(task: string, agent: AgentDefinition): ConfidenceResult {
  const taskLower = task.toLowerCase();
  const reasons: string[] = [];
  let score = 0;

  // Direct name mention — strong signal
  if (taskLower.includes(agent.name.toLowerCase())) {
    score += 0.4;
    reasons.push(`Name "${agent.name}" mentioned in task`);
  }

  // Description word overlap
  const descWords = new Set(
    agent.description
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3)
  );
  const taskWords = taskLower.split(/\s+/).filter((w) => w.length > 3);
  const overlap = taskWords.filter((w) => descWords.has(w));
  if (overlap.length > 0) {
    const descScore = Math.min(overlap.length * 0.08, 0.25);
    score += descScore;
    reasons.push(`${overlap.length} keyword overlap(s) with description`);
  }

  // Skill match
  for (const skill of agent.a2a.skills) {
    if (taskLower.includes(skill.toLowerCase().replace(/-/g, " "))) {
      score += 0.15;
      reasons.push(`Skill match: ${skill}`);
    }
  }

  // Tool match
  for (const tool of agent.tools) {
    if (taskLower.includes(tool.toLowerCase())) {
      score += 0.1;
      reasons.push(`Tool match: ${tool}`);
    }
  }

  // Persona keyword match
  const personaWords = new Set(
    agent.persona
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 4)
  );
  const personaOverlap = taskWords.filter((w) => personaWords.has(w));
  if (personaOverlap.length > 0) {
    score += Math.min(personaOverlap.length * 0.05, 0.15);
    reasons.push(`${personaOverlap.length} persona keyword match(es)`);
  }

  // Learned preferences match
  for (const [key, value] of Object.entries(agent.preferences.learned)) {
    const valStr = String(value).toLowerCase();
    if (taskLower.includes(key.toLowerCase()) || taskLower.includes(valStr)) {
      score += 0.1;
      reasons.push(`Learned preference match: ${key}`);
    }
  }

  score = Math.min(score, 1.0);

  return {
    agentId: agent.agentId,
    agentName: agent.name,
    score: Math.round(score * 100) / 100,
    reasoning:
      reasons.length > 0
        ? reasons.join("; ")
        : "No strong signals — low confidence match",
  };
}
