// Copyright (c) 2026 Synvoya. Apache-2.0 License.

import type { ImageAnalysis } from "../types/index.js";

/**
 * Accept an image from Chat and prepare it for vision processing.
 * The actual vision interpretation is done by the LLM (Claude Vision).
 * This module handles image validation, format detection, and
 * structured instruction generation.
 */
export function processImage(
  imageData: string,
  context?: string
): { valid: boolean; format: string; sizeKb: number; error?: string } {
  if (!imageData || imageData.length === 0) {
    return { valid: false, format: "unknown", sizeKb: 0, error: "Empty image data" };
  }

  const format = detectFormat(imageData);
  const sizeKb = Math.round((imageData.length * 3) / 4 / 1024);

  if (sizeKb > 20480) {
    return { valid: false, format, sizeKb, error: "Image too large (max 20MB)" };
  }

  return { valid: true, format, sizeKb };
}

/**
 * Build a vision prompt that combines the image with context.
 */
export function buildVisionPrompt(
  imageData: string,
  taskType: "analyze" | "implement" | "compare",
  context?: string
): string {
  const prompts: Record<string, string> = {
    analyze: [
      "Analyze this image and describe what you see.",
      "Identify any UI elements, errors, or notable features.",
      "Suggest specific actions based on the image content.",
      context ? `Additional context: ${context}` : "",
    ]
      .filter(Boolean)
      .join("\n"),

    implement: [
      "Look at this image (screenshot, mockup, or design).",
      "Generate the code needed to implement or fix what's shown.",
      "Be specific about HTML structure, CSS styles, and any interactive elements.",
      context ? `Additional context: ${context}` : "",
    ]
      .filter(Boolean)
      .join("\n"),

    compare: [
      "Compare these two screenshots.",
      "Identify all visual differences between expected and actual.",
      "Categorize differences as: layout, color, text, spacing, or missing elements.",
      context ? `Additional context: ${context}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  };

  return prompts[taskType] || prompts.analyze;
}

/**
 * Detect image format from base64 data.
 */
function detectFormat(data: string): string {
  if (data.startsWith("/9j/")) return "jpeg";
  if (data.startsWith("iVBOR")) return "png";
  if (data.startsWith("R0lGO")) return "gif";
  if (data.startsWith("UklGR")) return "webp";
  return "unknown";
}
