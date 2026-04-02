// Copyright (c) 2026 Synvoya. Apache-2.0 License.

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { HandoverData } from "../types/index.js";
import { prepareHandover } from "./engine.js";

/**
 * Write handover data to .cerebro/handover.json in the project directory.
 * New chat sessions can auto-read this on startup.
 */
export function writeHandoverFile(
  sessionId: string,
  projectPath: string
): boolean {
  const handover = prepareHandover(sessionId);
  if (!handover) return false;

  const cerebroDir = join(projectPath, ".cerebro");
  mkdirSync(cerebroDir, { recursive: true });

  const handoverPath = join(cerebroDir, "handover.json");
  writeFileSync(handoverPath, JSON.stringify(handover, null, 2), "utf-8");

  return true;
}

/**
 * Read handover data from .cerebro/handover.json.
 * Used by new sessions to auto-resume.
 */
export function readHandoverFile(
  projectPath: string
): HandoverData | null {
  const handoverPath = join(projectPath, ".cerebro", "handover.json");

  if (!existsSync(handoverPath)) return null;

  try {
    const raw = readFileSync(handoverPath, "utf-8");
    return JSON.parse(raw) as HandoverData;
  } catch {
    return null;
  }
}

/**
 * Check if a project has a handover file ready.
 */
export function hasHandoverFile(projectPath: string): boolean {
  return existsSync(join(projectPath, ".cerebro", "handover.json"));
}
