/**
 * Dump writer — turns per-case outcomes into the exported result formats:
 *   <agent>.dump.json          — the full per-case record (reply + trace + calls + invariant gate)
 *   <agent>.dump.tasks.jsonl   — one line per case that needs the LLM judge (rubric + reply + trace)
 *   <agent>.dump.autofail.json — the deterministic invariant-gate failures (folded into the score)
 * The tasks/autofail split mirrors the published pipeline: any case with an invariant failure is a
 * deterministic auto-fail and never reaches the judge; the rest become judge tasks.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { toolCallFailures } from './invariants.js';
import type { AutofailEntry, CaseOutcome, CaseSpec, DumpRecord, JudgeTask } from './types.js';

function dumpRecord(outcome: CaseOutcome, caseSpec: CaseSpec): DumpRecord {
  const invariantFailures = outcome.errorMsg
    ? [`run error: ${outcome.errorMsg}`, ...toolCallFailures(caseSpec, outcome.observed)]
    : toolCallFailures(caseSpec, outcome.observed);
  return {
    caseId: outcome.caseId,
    rep: outcome.rep,
    goldSeq: [],
    goldReply: [],
    actualReply: outcome.actualReply,
    actualTrace: outcome.actualTrace,
    actualCalls: outcome.actualCalls,
    status: invariantFailures.length ? 'fail' : 'pending',
    invariantFailures,
    judgeVerdict: null,
    judgeReasoning: [],
  };
}

/** Write the three per-agent dump artifacts for one rep. Returns counts for logging. */
export async function writeAgentDumps(
  repDir: string,
  agentId: string,
  outcomes: CaseOutcome[],
  casesById: Map<string, CaseSpec>,
): Promise<{ judge: number; autofail: number }> {
  await mkdir(repDir, { recursive: true });
  const records = outcomes
    .map((o) => dumpRecord(o, casesById.get(o.caseId)!))
    .sort((a, b) => a.caseId.localeCompare(b.caseId));

  const tasks: JudgeTask[] = [];
  const autofail: AutofailEntry[] = [];
  for (const r of records) {
    if (r.invariantFailures.length) {
      autofail.push({ caseId: r.caseId, rep: r.rep, reason: `invariant: ${r.invariantFailures.join('; ')}` });
      continue;
    }
    const spec = casesById.get(r.caseId)!;
    const rubric = (spec.expectations?.rubric ?? []).map((ri) => ({
      id: ri.id,
      description: ri.description,
      critical: ri.critical !== false,
    }));
    tasks.push({
      caseId: r.caseId,
      rep: r.rep,
      rubric,
      actualReply: r.actualReply,
      actualTrace: r.actualTrace,
      actualCalls: r.actualCalls,
      goldSeq: r.goldSeq,
      goldReply: r.goldReply,
    });
  }

  const base = join(repDir, agentId);
  await writeFile(`${base}.dump.json`, JSON.stringify(records, null, 2));
  await writeFile(`${base}.dump.tasks.jsonl`, tasks.map((t) => JSON.stringify(t)).join('\n') + (tasks.length ? '\n' : ''));
  await writeFile(`${base}.dump.autofail.json`, JSON.stringify(autofail, null, 2));
  return { judge: tasks.length, autofail: autofail.length };
}
