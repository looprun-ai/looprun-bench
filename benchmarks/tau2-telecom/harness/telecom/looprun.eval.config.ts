/**
 * looprun.eval.config.ts — the eval contract of the telecom domain (also the agentspec skill's
 * project sentinel). Wires the GENERATED bundle (SPECS + THEME), the GENERATED subject
 * (worldFactory + TOOL_DEFS), and the GENERATED eval set (CASES + CASE_MAP) into one EvalConfig the
 * `looprun-eval` CLI drives. The runner is looprun's ONE execution surface (LoopRunAgent on Mastra);
 * there is no adapter to write here.
 */
import { fileURLToPath } from 'node:url';
import type { EvalConfig } from '@looprun-ai/eval';
import { SPECS, THEME } from './src/agents/telecom/index.js';
import { worldFactory, TOOL_DEFS } from './src/world/world.js';
import { CASES, CASE_MAP } from './evals/cases.js';

const config: EvalConfig = {
  domain: 'telecom',
  specs: SPECS,
  theme: THEME,
  worldFactory,
  toolDefs: TOOL_DEFS,
  cases: CASES,
  caseMap: CASE_MAP,
  /** Domain judge RULES only — the packaged generic Claude-judge prompt owns the output format. */
  judgePromptPath: fileURLToPath(new URL('./evals/judge-prompt.md', import.meta.url)),
  /** Subject model defaults to gemini-3.1-flash-lite-thinkoff (the validation ruler); bar 0.90. */
  bar: 0.9,
};

export default config;
