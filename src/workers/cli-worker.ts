// Copyright (c) 2026 Synvoya. Apache-2.0 License.
// Multi-provider CLI worker — supports Claude Code, Codex, Aider, and any CLI tool.
// Zero-credential: Cerebro never stores or proxies credentials.
// Each CLI tool manages its own auth (claude login, codex auth, etc.)
// Cerebro spawns subprocesses that inherit the system's authentication context.
import { spawn } from "node:child_process";

// ─── Provider Adapters ───────────────────────────────────────────
// Each adapter knows how to format instructions for its CLI tool.
interface ProviderConfig {
  provider: string;
  binary: string;
  available: boolean;
  taskCategories: string[];
  formatArgs: (task: string) => string[];
  versionCommand: string;
}

const PROVIDERS: Record<string, ProviderConfig> = {
  "claude-code": {
    provider: "claude-code",
    binary: "claude",
    available: false,
    taskCategories: ["coding", "build", "test", "debug", "refactor", "deploy", "file-creation"],
    formatArgs: (task: string) => [
      task,  // No --print by default — interactive mode shows agent thinking
    ],
    versionCommand: "claude --version",
  },
  codex: {
    provider: "codex",
    binary: "codex",
    available: false,
    taskCategories: ["coding", "review", "test", "explain"],
    formatArgs: (task: string) => [
      "--quiet", task,
    ],
    versionCommand: "codex --version",
  },
  aider: {
    provider: "aider",
    binary: "aider",
    available: false,
    taskCategories: ["coding", "refactor", "pair-programming"],
    formatArgs: (task: string) => [
      "--message", task, "--yes-always",
    ],
    versionCommand: "aider --version",
  },
  generic: {
    provider: "generic",
    binary: "sh",
    available: true,
    taskCategories: ["shell", "script", "command"],
    formatArgs: (task: string) => [
      "-c", task,
    ],
    versionCommand: "sh --version",
  },
};

// ─── Provider Detection ──────────────────────────────────────────
/**
 * Detect which CLI providers are available on the system.
 * Runs version check for each provider.
 */
export async function detectAvailableProviders(): Promise<ProviderConfig[]> {
  const results: ProviderConfig[] = [];
  for (const [key, config] of Object.entries(PROVIDERS)) {
    const available = await checkProviderAvailable(config.versionCommand);
    config.available = available;
    if (available) results.push(config);
  }
  // Generic shell is always available
  if (!results.some((r) => r.provider === "generic")) {
    PROVIDERS.generic.available = true;
    results.push(PROVIDERS.generic);
  }
  return results;
}

async function checkProviderAvailable(versionCommand: string): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn("sh", ["-c", versionCommand], {
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 5000,
    });
    proc.on("close", (code) => resolve(code === 0));
    proc.on("error", () => resolve(false));
  });
}

/**
 * Get a specific provider's config.
 */
export function getProvider(provider: string): ProviderConfig {
  return PROVIDERS[provider] || PROVIDERS.generic;
}

/**
 * Get all registered providers.
 */
export function getAllProviders(): ProviderConfig[] {
  return Object.values(PROVIDERS);
}

export interface CliTaskOptions {
  command: string;
  cwd: string;
  timeout?: number;
  env?: Record<string, string>;
}

export interface CliTaskResult {
  success: boolean;
  output: string;
  artifacts: Array<{ type: string; name: string; content: string }>;
  duration: number;
  error?: string;
}

/**
 * Execute a raw shell command.
 * Each execution is a fresh process — anti-context-rot by design.
 * Zero-credential: subprocess inherits system auth context automatically.
 */
export async function executeCliTask(options: CliTaskOptions): Promise<CliTaskResult> {
  const { command, cwd, timeout = 300000, env } = options;
  const startTime = Date.now();

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const proc = spawn("sh", ["-c", command], {
      cwd,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill("SIGTERM");
      setTimeout(() => proc.kill("SIGKILL"), 5000);
    }, timeout);

    proc.stdout.on("data", (data: Buffer) => { stdout += data.toString(); });
    proc.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });

    proc.on("close", (code: number | null) => {
      clearTimeout(timer);
      const duration = Date.now() - startTime;
      if (timedOut) {
        resolve({
          success: false, output: stdout, artifacts: [], duration,
          error: `Command timed out after ${timeout}ms`,
        });
        return;
      }
      const success = code === 0;
      const artifacts: Array<{ type: string; name: string; content: string }> = [];
      if (stdout.trim()) {
        artifacts.push({ type: "text", name: "stdout", content: stdout.trim() });
      }
      if (stderr.trim() && !success) {
        artifacts.push({ type: "text", name: "stderr", content: stderr.trim() });
      }
      resolve({
        success,
        output: success
          ? stdout.trim() || "Command completed successfully"
          : `Exit code ${code}: ${stderr.trim() || stdout.trim()}`,
        artifacts,
        duration,
        error: success ? undefined : stderr.trim() || `Exit code ${code}`,
      });
    });

    proc.on("error", (err: Error) => {
      clearTimeout(timer);
      resolve({
        success: false, output: "", artifacts: [], duration: Date.now() - startTime,
        error: `Failed to spawn process: ${err.message}`,
      });
    });
  });
}

/**
 * Execute a task using a specific CLI provider.
 * Provider-agnostic: works with Claude Code, Codex, Aider, or any CLI.
 */
export async function executeViaProvider(
  provider: string, task: string, cwd: string,
): Promise<CliTaskResult> {
  const config = getProvider(provider);
  if (!config.available && config.provider !== "generic") {
    return {
      success: false, output: "", artifacts: [], duration: 0,
      error: `Provider "${provider}" is not installed. Run "${config.versionCommand}" to check, or install it first.`,
    };
  }
  const args = config.formatArgs(task);
  const command = `${config.binary} ${args.map((a) => `"${a.replace(/"/g, '\\"')}"`).join(" ")}`;
  return executeCliTask({ command, cwd, timeout: 600000 });
}

/**
 * Execute a task via Claude Code CLI specifically (convenience wrapper).
 */
export async function executeViaClaudeCode(
  task: string,
  cwd: string,
  options?: { model?: string; quiet?: boolean },
): Promise<CliTaskResult> {
  const config = getProvider("claude-code");
  const args: string[] = [];
  if (options?.model) args.push("--model", options.model);
  if (options?.quiet) args.push("--print");  // Only add --print in quiet mode
  args.push(task);
  const command = `${config.binary} ${args.map((a) => `"${a.replace(/"/g, '\\"')}"`).join(" ")}`;
  return executeCliTask({ command, cwd, timeout: 600000 });
}

/**
 * Check if a specific CLI provider is available.
 */
export async function isProviderAvailable(provider: string): Promise<boolean> {
  const config = getProvider(provider);
  return checkProviderAvailable(config.versionCommand);
}
