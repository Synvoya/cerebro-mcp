// Copyright (c) 2026 Synvoya. Apache-2.0 License.
// Context Watcher — Terminal Dashboard

import fs from "fs";
import path from "path";
import os from "os";
import { execSync, spawn } from "child_process";
import type { ContextWatcherStats } from "./tracker.js";

const TEMP_DIR = path.join(os.tmpdir(), "cerebro-watcher");
const STATE_FILE = path.join(TEMP_DIR, "state.json");
const PID_FILE = path.join(TEMP_DIR, "dashboard.pid");
const SCRIPT_FILE = path.join(TEMP_DIR, "dashboard.sh");

function ensureTempDir(): void {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

export function writeStateFile(stats: ContextWatcherStats): void {
  ensureTempDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(stats, null, 2));
}

export function isTerminalRunning(): boolean {
  if (!fs.existsSync(PID_FILE)) return false;
  try {
    const pid = parseInt(fs.readFileSync(PID_FILE, "utf-8").trim(), 10);
    process.kill(pid, 0);
    return true;
  } catch {
    // Process not alive — clean up stale PID file
    try { fs.unlinkSync(PID_FILE); } catch { /* ignore */ }
    return false;
  }
}

export function openTerminal(sessionId: string): { success: boolean; error?: string } {
  if (isTerminalRunning()) {
    return { success: true };
  }

  ensureTempDir();

  const script = generateDashboardScript(sessionId);
  fs.writeFileSync(SCRIPT_FILE, script, { mode: 0o755 });

  const platform = os.platform();

  try {
    if (platform === "darwin") {
      // execSync with osascript is needed here for AppleScript integration.
      // SCRIPT_FILE is a controlled path (os.tmpdir) — not user input.
      const appleScript = `tell application "Terminal"
  activate
  do script "${SCRIPT_FILE}"
end tell`;
      execSync(`osascript -e '${appleScript.replace(/'/g, "'\\''")}'`);
    } else if (platform === "linux") {
      try {
        spawn("gnome-terminal", ["--", "bash", SCRIPT_FILE], { detached: true, stdio: "ignore" }).unref();
      } catch {
        spawn("xterm", ["-e", "bash", SCRIPT_FILE], { detached: true, stdio: "ignore" }).unref();
      }
    } else {
      return { success: false, error: `Unsupported platform: ${platform}` };
    }
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

export function closeTerminal(): void {
  if (fs.existsSync(PID_FILE)) {
    try {
      const pid = parseInt(fs.readFileSync(PID_FILE, "utf-8").trim(), 10);
      process.kill(pid, 9);
    } catch { /* already dead */ }
  }
  for (const file of [PID_FILE, STATE_FILE, SCRIPT_FILE]) {
    try { fs.unlinkSync(file); } catch { /* ignore */ }
  }
}

function generateDashboardScript(sessionId: string): string {
  return `#!/usr/bin/env bash
# Cerebro Context Watcher Dashboard
# Session: ${sessionId}

echo $$ > "${PID_FILE}"

STATE_FILE="${STATE_FILE}"

# ANSI color codes
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[0;33m'
ORANGE='\\033[0;38;5;208m'
BOLD='\\033[1m'
DIM='\\033[2m'
RESET='\\033[0m'
BG_GREEN='\\033[42m'
BG_YELLOW='\\033[43m'
BG_ORANGE='\\033[48;5;208m'
BG_RED='\\033[41m'
WHITE='\\033[1;37m'

clear
echo -e "\${BOLD}Cerebro Context Watcher\${RESET}"
echo -e "\${DIM}Session: ${sessionId}\${RESET}"
echo ""
echo "Waiting for data..."

while true; do
  sleep 2

  if [ ! -f "$STATE_FILE" ]; then
    continue
  fi

  PARSED=$(python3 -c "
import json, sys
try:
    with open('$STATE_FILE') as f:
        d = json.load(f)
    print(d.get('percentUsed', 0))
    print(d.get('totalEstimatedTokens', 0))
    print(d.get('maxContextTokens', 200000))
    print(d.get('totalToolCalls', 0))
    print(d.get('estimatedCallsRemaining', 0))
    print(d.get('recommendation', ''))
    print(d.get('warningLevel', 'green'))
    print(d.get('handoverRecommended', False))
except Exception as e:
    print('ERROR')
    print(str(e))
    sys.exit(1)
" 2>/dev/null)

  if [ $? -ne 0 ]; then
    continue
  fi

  PERCENT=$(echo "$PARSED" | sed -n '1p')
  TOTAL_TOKENS=$(echo "$PARSED" | sed -n '2p')
  MAX_TOKENS=$(echo "$PARSED" | sed -n '3p')
  TOOL_CALLS=$(echo "$PARSED" | sed -n '4p')
  CALLS_REMAINING=$(echo "$PARSED" | sed -n '5p')
  RECOMMENDATION=$(echo "$PARSED" | sed -n '6p')
  WARNING_LEVEL=$(echo "$PARSED" | sed -n '7p')
  HANDOVER=$(echo "$PARSED" | sed -n '8p')

  # Build progress bar (30 chars wide)
  BAR_WIDTH=30
  FILLED=$(( PERCENT * BAR_WIDTH / 100 ))
  EMPTY=$(( BAR_WIDTH - FILLED ))

  case "$WARNING_LEVEL" in
    green)  BAR_COLOR="$BG_GREEN"; LABEL_COLOR="$GREEN" ;;
    yellow) BAR_COLOR="$BG_YELLOW"; LABEL_COLOR="$YELLOW" ;;
    orange) BAR_COLOR="$BG_ORANGE"; LABEL_COLOR="$ORANGE" ;;
    red)    BAR_COLOR="$BG_RED"; LABEL_COLOR="$RED" ;;
    *)      BAR_COLOR="$BG_GREEN"; LABEL_COLOR="$GREEN" ;;
  esac

  FILLED_BAR=""
  for ((i=0; i<FILLED; i++)); do FILLED_BAR+="\\ "; done
  EMPTY_BAR=""
  for ((i=0; i<EMPTY; i++)); do EMPTY_BAR+=" "; done

  REMAINING_TOKENS=$(( MAX_TOKENS - TOTAL_TOKENS ))
  if [ $REMAINING_TOKENS -lt 0 ]; then REMAINING_TOKENS=0; fi

  clear
  echo -e "\${BOLD}Cerebro Context Watcher\${RESET}"
  echo -e "\${DIM}Session: ${sessionId}\${RESET}"
  echo ""
  echo -e "\${BOLD}Context Usage:\${RESET}"
  echo -e "  \${BAR_COLOR}\${WHITE}\${FILLED_BAR}\${RESET}\${DIM}\${EMPTY_BAR}\${RESET} \${LABEL_COLOR}\${BOLD}\${PERCENT}%\${RESET}"
  echo ""
  echo -e "  \${BOLD}Tokens:\${RESET}  \${TOTAL_TOKENS} used / \${REMAINING_TOKENS} remaining"
  echo -e "  \${BOLD}Tools:\${RESET}   \${TOOL_CALLS} calls (\${CALLS_REMAINING} est. remaining)"
  echo ""
  echo -e "  \${LABEL_COLOR}\${RECOMMENDATION}\${RESET}"

  if [ "$HANDOVER" = "True" ]; then
    echo ""
    echo -e "  \${RED}\${BOLD}>>> HANDOVER RECOMMENDED — run prepare_handover <<<\${RESET}"
  fi

  echo ""
  echo -e "\${DIM}Refreshing every 2s | Ctrl+C to close\${RESET}"
done
`;
}
