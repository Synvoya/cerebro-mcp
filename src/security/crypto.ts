// Copyright (c) 2026 Synvoya. Apache-2.0 License.

import { createHmac, randomBytes, createHash } from "node:crypto";

const SECRET_KEY =
  process.env.CEREBRO_SECRET_KEY || randomBytes(32).toString("hex");

export function signToken(payload: string): string {
  return createHmac("sha256", SECRET_KEY).update(payload).digest("hex");
}

export function verifySignature(payload: string, signature: string): boolean {
  const expected = signToken(payload);
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

export function hashProjectState(projectPath: string, files: string[]): string {
  const content = [projectPath, ...files.sort()].join("\n");
  return createHash("sha256").update(content).digest("hex");
}

export function generateMessageHash(content: string, timestamp: string): string {
  return createHash("sha256")
    .update(`${content}:${timestamp}`)
    .digest("hex")
    .slice(0, 7);
}
