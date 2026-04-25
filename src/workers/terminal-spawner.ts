// Copyright (c) 2026 Synvoya. Apache-2.0 License.
// Terminal Spawner — opens visible Terminal windows for CLI execution.
// Each task gets its own window (anti-context-rot made visible).
// Mac: uses osascript (AppleScript) to open Terminal.app
// Linux: uses x-terminal-emulator or gnome-terminal
// Fallback: background subprocess
import { spawn, execSync } from "node:child_process";
import { writeFileSync, readFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir, platform } from "node:os";
import { resolveExecutionMode } from "./model-config.js";

const CEREBRO_TMP = join(tmpdir(), "cerebro-workers");

export interface SpawnOptions {
  taskId: string;
  agentName: string;
  taskDescription: string;
  provider: string;
  cwd: string;
  mode: "visible" | "background";
  model?: string;
  effort?: string;
  customCommand?: string;
  autoCloseTerminal?: boolean;
  executionMode?: "interactive" | "quiet";
}

export interface SpawnResult {
  success: boolean;
  output: string;
  artifacts: Array<{ type: "file" | "text" | "data" | "image"; name: string; content: string }>;
  duration: number;
  error?: string;
}

/**
 * Execute a task with either a visible terminal or background process.
 */
export async function spawnTask(options: SpawnOptions): Promise<SpawnResult> {
  mkdirSync(CEREBRO_TMP, { recursive: true });
  if (options.mode === "visible") {
    return spawnVisibleTerminal(options);
  }
  return spawnBackground(options);
}

// ─── Visible Terminal ────────────────────────────────────────────
async function spawnVisibleTerminal(options: SpawnOptions): Promise<SpawnResult> {
  const { taskId, agentName, taskDescription, provider, cwd, model, effort, customCommand } = options;
  const startTime = Date.now();

  // Resolve execution mode: interactive (default) or quiet
  const execMode = options.executionMode || resolveExecutionMode();

  const cliCommand = customCommand || buildCliCommand(provider, taskId, cwd, model, effort, execMode);
  const logFile = join(CEREBRO_TMP, `task-${taskId}.log`);
  const exitFile = join(CEREBRO_TMP, `task-${taskId}.exit`);
  const scriptFile = join(CEREBRO_TMP, `task-${taskId}.sh`);
  const taskFile = join(CEREBRO_TMP, `task-${taskId}.txt`);

  // Clean up any previous files
  for (const f of [logFile, exitFile]) {
    if (existsSync(f)) unlinkSync(f);
  }

  // ─── SHELL ESCAPE FIX ───────────────────────────────────────
  // Write task description to a separate file instead of inlining
  // it in the bash script. This prevents backticks, quotes, $(),
  // and other special characters from breaking the shell.
  writeFileSync(taskFile, taskDescription, { mode: 0o644 });

  // Create the wrapper script — task text is read from file, never inlined
  const script = `#!/bin/bash
clear
echo ""
echo "  🧠 Cerebro MCP — Worker Terminal"
echo "  ─────────────────────────────────────────"
echo "  Agent:    ${agentName}"
echo "  Provider: ${provider}"
${(() => {
    if (provider === "codex") {
      const isAnthropicModel = model && (model.toLowerCase().includes("sonnet") || model.toLowerCase().includes("opus") || model.toLowerCase().includes("haiku") || model.toLowerCase().includes("claude"));
      if (!model || isAnthropicModel) return 'echo "  Model:    gpt-5.4 (Codex default)"';
      return `echo "  Model:    ${model}"`;
    }
    return model ? `echo "  Model:    ${model}"` : '';
  })()}
${effort ? `echo "  Effort:   ${effort}"` : ""}
echo "  Mode:     ${execMode}"
echo "  ─────────────────────────────────────────"
echo ""
echo "  Task:"
cat "${taskFile}" | head -20 | sed 's/^/    /'
echo ""
echo "  ─────────────────────────────────────────"
echo ""
echo "  Working directory: ${cwd}"
echo ""

# Auto-init git for Codex (requires git repo)
if [ ! -d "${cwd}/.git" ] && [ "${provider}" = "codex" ]; then
  cd "${cwd}" 2>/dev/null && git init && git add -A && git commit -m "Initial commit for Codex" --allow-empty 2>/dev/null
  echo "  📦 Auto-initialized git repo for Codex"
fi

cd "${cwd}" 2>/dev/null || cd "$HOME"

${cliCommand} 2>&1 | tee "${logFile}"
EXIT_CODE=\${PIPESTATUS[0]}

echo ""
echo "  ─────────────────────────────────────────"
if [ $EXIT_CODE -eq 0 ]; then
  echo "  ✅ Task completed successfully"
else
  echo "  ❌ Task failed (exit code: \$EXIT_CODE)"
fi
echo "  Results sent back to Cerebro Chat"
echo "  ─────────────────────────────────────────"
echo ""

echo "\$EXIT_CODE" > "${exitFile}"

# Auto-open HTML files in browser if task succeeded
if [ \$EXIT_CODE -eq 0 ]; then
  HTML_FILE=$(find "${cwd}" -maxdepth 2 -name "*.html" -newer "${exitFile}" -o -name "*.html" 2>/dev/null | head -1)
  if [ -n "\$HTML_FILE" ]; then
    echo ""
    echo "  🌐 Opening \$HTML_FILE in browser..."
    open "\$HTML_FILE" 2>/dev/null || xdg-open "\$HTML_FILE" 2>/dev/null
  fi
fi

# Clean up task file
rm -f "${taskFile}" 2>/dev/null

${options.autoCloseTerminal ? '# Auto-closing terminal\nexit 0' : '# Keep window open for user to read\necho "  Terminal will stay open for review."\necho "  Close this window when done."'}
`;

  writeFileSync(scriptFile, script, { mode: 0o755 });

  // Open in visible terminal
  const os = platform();
  try {
    if (os === "darwin") {
      openMacTerminal(scriptFile, agentName);
    } else if (os === "linux") {
      openLinuxTerminal(scriptFile, agentName);
    } else {
      // Windows or unsupported — fall back to background
      console.error(`Visible terminal not supported on ${os}, falling back to background`);
      return spawnBackground(options);
    }
  } catch (err) {
    console.error(`Failed to open terminal: ${err}`);
    return spawnBackground(options);
  }

  // Poll for completion
  return pollForResult(taskId, logFile, exitFile, startTime, 600000);
}

function openMacTerminal(scriptFile: string, title: string): void {
  const appleScript = `
    tell application "Terminal"
      activate
      set newTab to do script "bash \\\\"${scriptFile}\\\\""
      set custom title of front window to "Cerebro: ${title.replace(/["\\\\\']/g, ' ')}"
    end tell
  `;
  execSync(`osascript -e '${appleScript.replace(/'/g, "'\\\\''")}'`);
}

function openLinuxTerminal(scriptFile: string, title: string): void {
  const terminals = [
    { cmd: "gnome-terminal", args: ["--title", `Cerebro: ${title}`, "--", "bash", scriptFile] },
    { cmd: "xterm", args: ["-title", `Cerebro: ${title}`, "-e", `bash ${scriptFile}`] },
    { cmd: "x-terminal-emulator", args: ["-e", `bash ${scriptFile}`] },
  ];
  for (const term of terminals) {
    try {
      execSync(`which ${term.cmd}`);
      spawn(term.cmd, term.args, { detached: true, stdio: "ignore" }).unref();
      return;
    } catch {
      continue;
    }
  }
  throw new Error("No supported terminal emulator found");
}

// ─── Background Mode ─────────────────────────────────────────────
async function spawnBackground(options: SpawnOptions): Promise<SpawnResult> {
  const { taskId, taskDescription, provider, cwd, model, effort, customCommand } = options;
  const startTime = Date.now();
  const execMode = options.executionMode || resolveExecutionMode();
  const cliCommand = customCommand || buildCliCommand(provider, taskId, cwd, model, effort, execMode);

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const resolvedCwd = existsSync(cwd) ? cwd :
      (existsSync(cwd.replace(/^~/, process.env.HOME || "")) ? cwd.replace(/^~/, process.env.HOME || "") : process.cwd());

    const proc = spawn("sh", ["-c", cliCommand], {
      cwd: resolvedCwd,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill("SIGTERM");
      setTimeout(() => proc.kill("SIGKILL"), 5000);
    }, 600000);

    proc.stdout.on("data", (data: Buffer) => { stdout += data.toString(); });
    proc.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });

    proc.on("close", (code: number | null) => {
      clearTimeout(timer);
      const duration = Date.now() - startTime;
      const success = !timedOut && code === 0;
      const artifacts: Array<{ type: "file" | "text" | "data" | "image"; name: string; content: string }> = [];
      if (stdout.trim()) {
        artifacts.push({ type: "text", name: "stdout", content: stdout.trim() });
      }

      resolve({
        success,
        output: timedOut
          ? "Task timed out"
          : success
            ? stdout.trim() || "Completed"
            : `Exit code ${code}: ${stderr.trim() || stdout.trim()}`,
        artifacts,
        duration,
        error: success ? undefined : timedOut ? "Timed out" : stderr.trim() || `Exit code ${code}`,
      });
    });

    proc.on("error", (err: Error) => {
      clearTimeout(timer);
      resolve({
        success: false, output: "", artifacts: [], duration: Date.now() - startTime,
        error: `Spawn failed: ${err.message}`,
      });
    });
  });
}

// ─── CLI Command Builder ─────────────────────────────────────────
// Task is read from a temp file — never inlined into the shell command.
// This prevents all shell escaping issues with backticks, quotes, $(), etc.
function buildCliCommand(
  provider: string,
  taskId: string,
  cwd: string,
  model?: string,
  effort?: string,
  executionMode: "interactive" | "quiet" = "interactive",
): string {
  const taskFile = join(CEREBRO_TMP, `task-${taskId}.txt`);

  switch (provider) {
    case "claude-code": {
      const args: string[] = [];

      // Only pass --model if it's NOT an Anthropic model
      const isAnthropicModel = model && (model.toLowerCase().includes("sonnet") ||
        model.toLowerCase().includes("opus") ||
        model.toLowerCase().includes("haiku") ||
        model.toLowerCase().includes("claude"));
      if (model && !isAnthropicModel) args.push("--model", model);

      args.push("--dangerously-skip-permissions");

      // Execution mode: interactive shows live agent thinking, quiet shows only result
      if (executionMode === "quiet") {
        args.push("--print");
      }

      // Read task from file — safe from all shell escaping issues
      return `claude ${args.join(" ")} "$(cat '${taskFile}')"`;
    }

    case "codex": {
      const args: string[] = ["exec"];
      const isAnthropicModel = model && (model.toLowerCase().includes("sonnet") ||
        model.toLowerCase().includes("opus") ||
        model.toLowerCase().includes("haiku") ||
        model.toLowerCase().includes("claude"));
      if (model && !isAnthropicModel) args.push("--model", model);
      args.push("--full-auto");
      return `codex ${args.join(" ")} "$(cat '${taskFile}')"`;
    }

    case "aider": {
      const args: string[] = [];
      if (model) args.push("--model", model);
      args.push("--message");
      return `aider ${args.join(" ")} "$(cat '${taskFile}')" --yes-always`;
    }

    case "generic":
    default:
      return `bash '${taskFile}'`;
  }
}

// ─── Result Polling ──────────────────────────────────────────────
async function pollForResult(
  taskId: string,
  logFile: string,
  exitFile: string,
  startTime: number,
  timeout: number,
): Promise<SpawnResult> {
  const pollInterval = 2000;
  const maxPolls = Math.ceil(timeout / pollInterval);

  for (let i = 0; i < maxPolls; i++) {
    await sleep(pollInterval);

    if (existsSync(exitFile)) {
      const exitCode = parseInt(readFileSync(exitFile, "utf-8").trim(), 10);
      const output = existsSync(logFile) ? readFileSync(logFile, "utf-8") : "";
      const duration = Date.now() - startTime;
      const success = exitCode === 0;

      // Clean up temp files
      try {
        unlinkSync(exitFile);
        if (existsSync(logFile)) unlinkSync(logFile);
        unlinkSync(join(CEREBRO_TMP, `task-${taskId}.sh`));
        // Task file cleaned up by the script itself, but just in case:
        const taskFile = join(CEREBRO_TMP, `task-${taskId}.txt`);
        if (existsSync(taskFile)) unlinkSync(taskFile);
      } catch { /* ignore cleanup errors */ }

      const artifacts: Array<{ type: "file" | "text" | "data" | "image"; name: string; content: string }> = [];
      if (output.trim()) {
        artifacts.push({ type: "text", name: "output", content: output.trim() });
      }

      return {
        success,
        output: success
          ? output.trim() || "Completed successfully"
          : `Exit code ${exitCode}: ${output.trim()}`,
        artifacts,
        duration,
        error: success ? undefined : `CLI exited with code ${exitCode}`,
      };
    }
  }

  return {
    success: false,
    output: "",
    artifacts: [],
    duration: Date.now() - startTime,
    error: `Task timed out after ${timeout}ms waiting for CLI to complete`,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
