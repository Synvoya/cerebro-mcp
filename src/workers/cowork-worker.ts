// Copyright (c) 2026 Synvoya. Apache-2.0 License.

import type { TaskResult } from "../types/index.js";

/**
 * Cowork worker — V2 placeholder.
 * 
 * Anthropic's Cowork does not currently expose a public MCP API.
 * In V1, CLI workers handle file creation tasks (docx, pptx, xlsx)
 * directly using file creation skills.
 * 
 * When Anthropic opens a Cowork API, this adapter will be implemented
 * to route document/presentation/spreadsheet tasks to Cowork.
 */
export async function executeViaCowork(
  task: string,
  _cwd: string
): Promise<TaskResult> {
  return {
    success: false,
    output: `Cowork integration deferred to V2. Task: "${task}". Use CLI worker with file creation skills instead.`,
    artifacts: [],
    duration: 0,
    error: "Cowork API not yet available — use CLI worker for file creation",
  };
}

export function isCoworkAvailable(): boolean {
  return false;
}
