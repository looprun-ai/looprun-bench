/**
 * Shared arm-runner: iterates the subject buckets × cases × reps, builds a FRESH world per case
 * (full per-case isolation — a new world + preset every time), drives the arm, gates the observed
 * calls through the invariants, and writes the per-agent dumps. Both arms (governed / ungoverned)
 * plug in a `driver` that plays one case and returns its per-turn replies + tool calls.
 */
import { join } from 'node:path';
import { parseCli } from './config.js';
import type { CliOptions } from './config.js';
import { loadSubject } from './load.js';
import type { Bucket, Subject } from './load.js';
import { writeAgentDumps } from './dump.js';
import type { CaseOutcome, CaseSpec, ObservedCall } from './types.js';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** The per-turn record a driver returns for one case (reply text + the calls executed that turn). */
export interface DriveTurn {
  assistantFinalText: string;
  toolCalls: { name: string; args: any; tookEffect?: boolean }[];
}
export interface DriveResult {
  turnRecords: DriveTurn[];
  errorMsg?: string;
}
export type Driver = (agentId: string, caseSpec: CaseSpec, world: any, rep: number) => Promise<DriveResult>;

export interface ArmSpec {
  armName: string;
  /** Load whatever the arm needs (spec bundle / agent bundle); returns the per-case driver. */
  prepare(subject: Subject): Promise<Driver>;
  /** The agent id (governed spec id or ungoverned agent id) for a bucket — names the output files. */
  bucketAgentId(bucket: Bucket): string;
}

function safeParseArgs(v: unknown): Record<string, unknown> {
  if (v && typeof v === 'object') return v as Record<string, unknown>;
  if (typeof v === 'string') {
    try { const p = JSON.parse(v); return p && typeof p === 'object' ? p : {}; } catch { return {}; }
  }
  return {};
}

/** A `--cases` token matches a case by full id, by `<prefix>-...`, or by its leading numeric code. */
function caseSelected(sel: Set<string> | undefined, id: string): boolean {
  if (!sel) return true;
  if (sel.has(id)) return true;
  const code = id.split('-')[0];
  for (const t of sel) if (id.startsWith(`${t}-`) || t === code) return true;
  return false;
}

function toOutcome(caseSpec: CaseSpec, rep: number, dr: DriveResult): CaseOutcome {
  const observed: ObservedCall[] = dr.turnRecords.flatMap((t) =>
    (t.toolCalls ?? []).map((c) => ({ name: c.name, args: safeParseArgs(c.args), tookEffect: c.tookEffect !== false })),
  );
  return {
    caseId: caseSpec.id,
    rep,
    actualReply: dr.turnRecords.map((t) => t.assistantFinalText ?? ''),
    actualTrace: observed.map((o) => o.name),
    actualCalls: observed.map((o) => ({ name: o.name, args: o.args })),
    observed,
    errorMsg: dr.errorMsg,
  };
}

function defaultOut(armName: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  return join(process.cwd(), 'runs', `${armName}-${ts}`);
}

/** Run one arm end-to-end: cases × reps → per-agent dumps under `<out>/rep<N>/`. */
export async function runArm(arm: ArmSpec, argv: string[]): Promise<void> {
  const cli: CliOptions = parseCli(argv);
  const subject = await loadSubject();
  const driver = await arm.prepare(subject);
  const outBase = cli.out ?? defaultOut(arm.armName);

  console.log(`[${arm.armName}] out=${outBase} reps=${cli.reps}` +
    (cli.cases ? ` cases=${[...cli.cases].join(',')}` : ' cases=all') +
    (cli.agents ? ` agents=${[...cli.agents].join(',')}` : ''));

  for (let rep = 0; rep < cli.reps; rep++) {
    const repDir = join(outBase, `rep${rep}`);
    for (const bucket of subject.buckets) {
      const agentId = arm.bucketAgentId(bucket);
      if (cli.agents && !cli.agents.has(agentId)) continue;
      const casesById = new Map<string, CaseSpec>();
      const outcomes: CaseOutcome[] = [];
      for (const caseSpec of bucket.cases) {
        if (!caseSelected(cli.cases, caseSpec.id)) continue;
        casesById.set(caseSpec.id, caseSpec);
        const world = subject.makeWorld(caseSpec.setup.brandPreset);
        let dr: DriveResult;
        try {
          dr = await driver(agentId, caseSpec, world, rep);
        } catch (e) {
          dr = { turnRecords: [], errorMsg: String((e as any)?.message ?? e) };
        }
        const outcome = toOutcome(caseSpec, rep, dr);
        outcomes.push(outcome);
        const nFail = dr.errorMsg ? ' ERROR' : '';
        console.log(`[${arm.armName}] rep${rep} ${agentId} ${caseSpec.id} — ${outcome.actualTrace.length} calls${nFail}`);
      }
      if (outcomes.length) {
        const { judge, autofail } = await writeAgentDumps(repDir, agentId, outcomes, casesById);
        console.log(`[${arm.armName}] rep${rep} ${agentId}: ${judge} to judge, ${autofail} auto-fail → ${repDir}/${agentId}.dump.*`);
      }
    }
  }
  console.log(`[${arm.armName}] DONE → ${outBase}`);
  console.log(`  next: pnpm judge --dir ${outBase}   then   pnpm score --dir ${outBase}`);
}
