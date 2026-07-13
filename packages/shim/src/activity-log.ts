/**
 * src/shim/activity-log.ts — a per-request JSONL log of what looprun did while governing one tau2
 * step: vetoes, redrive counts, honest-abstains, and postTool corrections. One file per server
 * process (governed/runs/activity-<startTs>.jsonl), so a smoke run's activity is easy to isolate.
 */
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const RUNS_DIR = process.env.LOOPRUN_RUNS_DIR ?? `${HERE}/../../runs`;

export interface ActivityEvent {
  ts: number;
  turnIndex: number;
  /** 'allow' = tool_call(s) passed preTool and were returned unchanged; 'veto-redrive' = a preTool
   *  veto forced a no-tools redrive/abstain; 'reply' = the subject proposed no tool call at all. */
  path: 'allow' | 'veto-redrive' | 'reply';
  proposedTools: string[];
  vetoes: Array<{ tool: string; reason: string }>;
  redrives: number;
  abstained: boolean;
  postToolCorrections: string[];
}

let logFile: string | null = null;
function resolveLogFile(): string {
  if (!logFile) {
    mkdirSync(RUNS_DIR, { recursive: true });
    logFile = `${RUNS_DIR}/activity-${Date.now()}.jsonl`;
  }
  return logFile;
}

/** Force a specific log file (e.g. from a smoke script that wants a known, isolated path). */
export function setActivityLogFile(path: string): void {
  mkdirSync(dirname(path), { recursive: true });
  logFile = path;
}

export function logActivity(event: ActivityEvent): void {
  const file = resolveLogFile();
  appendFileSync(file, `${JSON.stringify(event)}\n`, 'utf8');
}

export function currentActivityLogFile(): string {
  return resolveLogFile();
}
