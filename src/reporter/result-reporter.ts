// Copyright (c) 2026 Synvoya. Apache-2.0 License.

import type { TaskResult } from "../types/index.js";

/**
 * Translate raw CLI output into human-friendly summaries for non-coders.
 * This is a heuristic reporter — the Chat brain (LLM) does the final
 * natural language generation. This provides structure and key extraction.
 */
export function formatTaskResult(result: TaskResult): string {
  if (result.success) {
    return formatSuccess(result);
  }
  return formatFailure(result);
}

function formatSuccess(result: TaskResult): string {
  const lines: string[] = [];
  lines.push("✅ Task completed successfully");

  if (result.duration > 0) {
    lines.push(`⏱ Duration: ${formatDuration(result.duration)}`);
  }

  if (result.output && result.output.length < 500) {
    lines.push(`\nOutput:\n${result.output}`);
  } else if (result.output) {
    lines.push(`\nOutput (truncated):\n${result.output.slice(0, 500)}...`);
  }

  if (result.artifacts.length > 0) {
    lines.push(`\n📦 Artifacts: ${result.artifacts.length}`);
    for (const artifact of result.artifacts) {
      lines.push(`  - ${artifact.name} (${artifact.type})`);
    }
  }

  return lines.join("\n");
}

function formatFailure(result: TaskResult): string {
  const lines: string[] = [];
  lines.push("❌ Task failed");

  if (result.duration > 0) {
    lines.push(`⏱ Duration: ${formatDuration(result.duration)}`);
  }

  if (result.error) {
    lines.push(`\nError: ${summarizeError(result.error)}`);
  }

  return lines.join("\n");
}

/**
 * Summarize common error patterns into non-coder-friendly messages.
 */
function summarizeError(error: string): string {
  const lower = error.toLowerCase();

  if (lower.includes("enoent") || lower.includes("not found")) {
    return "A required file or command was not found. Check that all dependencies are installed.";
  }
  if (lower.includes("permission denied") || lower.includes("eacces")) {
    return "Permission denied. The operation needs elevated access.";
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "The operation took too long and was stopped. It may need to be broken into smaller steps.";
  }
  if (lower.includes("syntax error") || lower.includes("syntaxerror")) {
    return "There's a syntax error in the code. Needs debugging.";
  }
  if (lower.includes("module not found") || lower.includes("cannot find module")) {
    return "A required package is missing. Need to install dependencies.";
  }
  if (lower.includes("econnrefused") || lower.includes("network")) {
    return "Network connection failed. Check if the target service is running.";
  }
  if (lower.includes("out of memory") || lower.includes("heap")) {
    return "Ran out of memory. The task may need optimization.";
  }

  // Return first 200 chars of raw error if no pattern matches
  return error.length > 200 ? error.slice(0, 200) + "..." : error;
}

/**
 * Extract test results from common test runner output.
 */
export function parseTestOutput(output: string): {
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  summary: string;
} {
  const defaults = { passed: 0, failed: 0, skipped: 0, total: 0, summary: "" };

  // Vitest/Jest pattern
  const vitestMatch = output.match(
    /Tests\s+(\d+)\s+passed.*?(\d+)\s+failed.*?(\d+)\s+total/i
  );
  if (vitestMatch) {
    const passed = parseInt(vitestMatch[1]);
    const failed = parseInt(vitestMatch[2]);
    const total = parseInt(vitestMatch[3]);
    return {
      passed,
      failed,
      skipped: total - passed - failed,
      total,
      summary: failed === 0
        ? `All ${total} tests passing ✅`
        : `${failed} of ${total} tests failing ❌`,
    };
  }

  // Generic pass/fail extraction
  const passMatch = output.match(/(\d+)\s+pass/i);
  const failMatch = output.match(/(\d+)\s+fail/i);
  if (passMatch || failMatch) {
    const passed = passMatch ? parseInt(passMatch[1]) : 0;
    const failed = failMatch ? parseInt(failMatch[1]) : 0;
    const total = passed + failed;
    return {
      passed,
      failed,
      skipped: 0,
      total,
      summary: failed === 0
        ? `All ${total} tests passing ✅`
        : `${failed} of ${total} tests failing ❌`,
    };
  }

  return { ...defaults, summary: "Could not parse test output" };
}

/**
 * Extract build status from common build tool output.
 */
export function parseBuildOutput(output: string): {
  success: boolean;
  warnings: number;
  errors: number;
  summary: string;
} {
  const lower = output.toLowerCase();

  const errorMatch = output.match(/(\d+)\s+error/i);
  const warningMatch = output.match(/(\d+)\s+warning/i);
  const errors = errorMatch ? parseInt(errorMatch[1]) : 0;
  const warnings = warningMatch ? parseInt(warningMatch[1]) : 0;

  const success =
    errors === 0 &&
    !lower.includes("build failed") &&
    !lower.includes("compilation failed");

  let summary = success ? "Build succeeded ✅" : "Build failed ❌";
  if (warnings > 0) summary += ` (${warnings} warning${warnings > 1 ? "s" : ""})`;
  if (errors > 0) summary += ` (${errors} error${errors > 1 ? "s" : ""})`;

  return { success, warnings, errors, summary };
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}
