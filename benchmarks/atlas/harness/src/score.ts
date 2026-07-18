/**
 * Score aggregator — folds the deterministic auto-fails and the LLM-judge verdicts into a pass-rate,
 * per rep and averaged. A case FAILS if it is a deterministic invariant auto-fail OR the judge ruled
 * it fail (or produced no verdict). Pass-rate = passed / (judge tasks + auto-fails).
 *
 *   pnpm score --dir runs/gov
 */
import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { parseCli } from './config.js';
import type { AutofailEntry, CaseVerdict, JudgeTask } from './types.js';

async function exists(p: string): Promise<boolean> {
  try { await stat(p); return true; } catch { return false; }
}

async function readJsonl<T>(p: string): Promise<T[]> {
  if (!(await exists(p))) return [];
  return (await readFile(p, 'utf8')).split('\n').filter(Boolean).map((l) => JSON.parse(l) as T);
}

async function readJson<T>(p: string, fallback: T): Promise<T> {
  if (!(await exists(p))) return fallback;
  return JSON.parse(await readFile(p, 'utf8')) as T;
}

interface RepScore {
  rep: string;
  total: number;
  passed: number;
  autofail: number;
  judgeFail: number;
  missing: number;
  fails: string[];
}

async function scoreRepDir(dir: string, repLabel: string): Promise<RepScore> {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.dump.tasks.jsonl'));
  let total = 0, passed = 0, autofail = 0, judgeFail = 0, missing = 0;
  const fails: string[] = [];
  for (const tf of files) {
    const agent = tf.replace(/\.dump\.tasks\.jsonl$/, '');
    const tasks = await readJsonl<JudgeTask>(join(dir, tf));
    const verdicts = await readJsonl<CaseVerdict>(join(dir, `${agent}.verdicts.jsonl`));
    const afs = await readJson<AutofailEntry[]>(join(dir, `${agent}.dump.autofail.json`), []);
    const byId = new Map(verdicts.map((v) => [v.caseId, v]));
    total += tasks.length + afs.length;
    autofail += afs.length;
    for (const af of afs) fails.push(`${af.caseId} (autofail)`);
    for (const t of tasks) {
      const v = byId.get(t.caseId);
      if (!v) { missing++; fails.push(`${t.caseId} (no verdict)`); }
      else if (v.overall === 'pass') passed++;
      else { judgeFail++; fails.push(`${t.caseId} (judge)`); }
    }
  }
  return { rep: repLabel, total, passed, autofail, judgeFail, missing, fails: fails.sort() };
}

async function main(): Promise<void> {
  const cli = parseCli(process.argv.slice(2));
  const dir = cli.rest.dir ?? cli.out;
  if (!dir) {
    console.error('usage: pnpm score --dir <runDir>');
    process.exit(2);
  }
  // rep dirs = immediate subdirs named rep*; if none, treat `dir` itself as a single rep.
  const entries = await readdir(dir, { withFileTypes: true });
  const repDirs = entries.filter((e) => e.isDirectory() && /^rep\d+$/.test(e.name)).map((e) => e.name).sort();
  const scores: RepScore[] = [];
  if (repDirs.length) {
    for (const r of repDirs) scores.push(await scoreRepDir(join(dir, r), r));
  } else {
    scores.push(await scoreRepDir(dir, '(single)'));
  }

  console.log(`\nAtlas score — ${dir}`);
  console.log('  (fail = deterministic invariant auto-fail  ∪  judge-fail)');
  const rates: number[] = [];
  for (const s of scores) {
    const rate = s.total ? (100 * s.passed) / s.total : 0;
    rates.push(rate);
    console.log(
      `  ${s.rep.padEnd(10)} ${s.passed}/${s.total} = ${rate.toFixed(1)}%   ` +
        `(auto-fail ${s.autofail}, judge-fail ${s.judgeFail}${s.missing ? `, missing ${s.missing}` : ''})`,
    );
    if (s.fails.length) console.log(`     fails: ${s.fails.join(', ')}`);
  }
  if (rates.length > 1) {
    const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
    console.log(`  ${'mean'.padEnd(10)} ${mean.toFixed(1)}%  (N=${rates.length})`);
  }
  console.log('\n  NOTE: published Atlas numbers were scored by a held-constant judge (ruler-v2).');
  console.log('  A reproduction with a different judge model is informative, not directly comparable.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
