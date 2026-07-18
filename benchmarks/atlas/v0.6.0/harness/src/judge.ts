/**
 * Judge runner — grades the judge tasks a run produced. For each `*.dump.tasks.jsonl` it calls a
 * configurable judge model with the subject's judge prompt (`subject/judge-prompt.md`) and writes a
 * sibling `*.verdicts.jsonl` ({caseId, rep, verdicts:[{id,pass,reasoning}], overall}). A case's
 * `overall` is `pass` iff every CRITICAL rubric item passes.
 *
 * Two judge paths (env JUDGE_PROVIDER, or inferred from the keys present):
 *   - anthropic → POST /v1/messages           (ANTHROPIC_API_KEY, JUDGE_MODEL_ID)
 *   - openai    → POST /v1/chat/completions    (JUDGE_OPENAI_BASE_URL + JUDGE_API_KEY, JUDGE_MODEL_ID)
 *
 * IMPORTANT: the published Atlas numbers were scored by a specific held-constant judge ("ruler-v2").
 * A reproduction with a different judge model is informative, NOT directly comparable.
 *
 *   pnpm judge --dir runs/gov [--concurrency 4]
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { editionPath, DEFAULTS, parseCli } from './config.js';
import type { CaseVerdict, ItemVerdict, JudgeTask, RubricItem } from './types.js';

/* eslint-disable @typescript-eslint/no-explicit-any */

type JudgeProvider = 'anthropic' | 'openai';
interface JudgeConfig {
  provider: JudgeProvider;
  model: string;
  apiKey: string;
  baseURL: string;
}

function judgeConfig(): JudgeConfig {
  const explicit = (process.env.JUDGE_PROVIDER ?? '').trim().toLowerCase();
  const provider: JudgeProvider =
    explicit === 'anthropic' || explicit === 'openai'
      ? explicit
      : (process.env.ANTHROPIC_API_KEY ?? '').trim()
        ? 'anthropic'
        : 'openai';
  const model = (process.env.JUDGE_MODEL_ID ?? '').trim();
  if (!model) throw new Error('set JUDGE_MODEL_ID (the judge model to grade with).');
  if (provider === 'anthropic') {
    const apiKey = (process.env.ANTHROPIC_API_KEY ?? '').trim();
    if (!apiKey) throw new Error('JUDGE_PROVIDER=anthropic needs ANTHROPIC_API_KEY.');
    return { provider, model, apiKey, baseURL: (process.env.JUDGE_BASE_URL ?? 'https://api.anthropic.com').trim() };
  }
  const apiKey = (process.env.JUDGE_API_KEY ?? process.env.OPENAI_API_KEY ?? '').trim();
  const baseURL = (process.env.JUDGE_OPENAI_BASE_URL ?? process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1').trim();
  if (!apiKey) throw new Error('JUDGE_PROVIDER=openai needs JUDGE_API_KEY (or OPENAI_API_KEY).');
  return { provider, model, apiKey, baseURL };
}

const OUTPUT_CONTRACT = `
---
## Output contract (STRICT)

You are grading exactly ONE case. The user message is a JSON object with:
- \`rubric\`: items, each { "id", "description", "critical" } — apply the ruling principles above,
- \`actualReply\`: the assistant's reply text, one entry per conversation turn,
- \`actualTrace\`: the tool names the assistant called this case, in order,
- \`actualCalls\`: those tool calls with their arguments.

Return ONLY a JSON object (no prose, no markdown fence) of the form:
{"verdicts":[{"id":"<rubric item id>","pass":true|false,"reasoning":"<one short sentence>"}]}
with EXACTLY one entry per rubric item, reusing each item's id. Do not add or drop items.`;

function extractJson(text: string): any {
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) s = s.slice(start, end + 1);
  return JSON.parse(s);
}

async function callJudge(cfg: JudgeConfig, system: string, user: string): Promise<string> {
  if (cfg.provider === 'anthropic') {
    const res = await fetch(`${cfg.baseURL}/v1/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': cfg.apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: cfg.model, max_tokens: 1024, system, messages: [{ role: 'user', content: user }] }),
    });
    if (!res.ok) throw new Error(`anthropic judge ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const j: any = await res.json();
    return (j.content ?? []).map((c: any) => c.text ?? '').join('');
  }
  const res = await fetch(`${cfg.baseURL}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({ model: cfg.model, temperature: 0, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
  });
  if (!res.ok) throw new Error(`openai judge ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j: any = await res.json();
  return j.choices?.[0]?.message?.content ?? '';
}

function overallOf(rubric: RubricItem[], verdicts: ItemVerdict[]): 'pass' | 'fail' {
  const byId = new Map(verdicts.map((v) => [v.id, v]));
  for (const item of rubric) {
    if (item.critical === false) continue;
    const v = byId.get(item.id);
    if (!v || !v.pass) return 'fail';
  }
  return 'pass';
}

async function judgeTask(cfg: JudgeConfig, system: string, task: JudgeTask): Promise<CaseVerdict> {
  const user = JSON.stringify(
    { caseId: task.caseId, rubric: task.rubric, actualReply: task.actualReply, actualTrace: task.actualTrace, actualCalls: task.actualCalls },
    null,
    2,
  );
  const raw = await callJudge(cfg, system, user);
  let verdicts: ItemVerdict[] = [];
  try {
    const parsed = extractJson(raw);
    verdicts = (parsed.verdicts ?? []).map((v: any) => ({ id: String(v.id), pass: v.pass === true, reasoning: String(v.reasoning ?? '') }));
  } catch (e) {
    verdicts = task.rubric.map((r) => ({ id: r.id, pass: false, reasoning: `judge parse error: ${String((e as any)?.message ?? e)}` }));
  }
  return { caseId: task.caseId, rep: task.rep, verdicts, overall: overallOf(task.rubric, verdicts) };
}

/** Simple bounded-concurrency map. */
async function pool<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

async function findTaskFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await findTaskFiles(p)));
    else if (entry.name.endsWith('.dump.tasks.jsonl')) out.push(p);
  }
  return out;
}

async function main(): Promise<void> {
  const cli = parseCli(process.argv.slice(2));
  const dir = cli.rest.dir ?? cli.out;
  const single = cli.rest.tasks;
  if (!dir && !single) {
    console.error('usage: pnpm judge --dir <runDir>   (or --tasks <file.dump.tasks.jsonl>)');
    process.exit(2);
  }
  const cfg = judgeConfig();
  const system = (await readFile(join(editionPath('SUBJECT_DIR', DEFAULTS.SUBJECT_DIR), 'judge-prompt.md'), 'utf8')) + '\n' + OUTPUT_CONTRACT;
  const concurrency = Number(cli.rest.concurrency ?? process.env.JUDGE_CONCURRENCY ?? 4);

  const taskFiles = single ? [single] : await findTaskFiles(dir!);
  console.log(`[judge] provider=${cfg.provider} model=${cfg.model} files=${taskFiles.length} concurrency=${concurrency}`);
  console.log('[judge] NOTE: published numbers used a held-constant judge (ruler-v2); a different judge model is informative, not directly comparable.');

  for (const tf of taskFiles) {
    const lines = (await readFile(tf, 'utf8')).split('\n').filter(Boolean);
    const tasks = lines.map((l) => JSON.parse(l) as JudgeTask);
    const verdicts = await pool(tasks, concurrency, (t) => judgeTask(cfg, system, t));
    const outPath = tf.replace(/\.dump\.tasks\.jsonl$/, '.verdicts.jsonl');
    await writeFile(outPath, verdicts.map((v) => JSON.stringify(v)).join('\n') + (verdicts.length ? '\n' : ''));
    const pass = verdicts.filter((v) => v.overall === 'pass').length;
    console.log(`[judge] ${tf.split('/').slice(-2).join('/')}: ${pass}/${verdicts.length} pass → ${outPath.split('/').pop()}`);
  }
  console.log('[judge] DONE');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
