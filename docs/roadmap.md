# Roadmap — resume here

The single source of truth for "what's done, what's next." Read `CLAUDE.md` first for the hard rules.

## ▶ START HERE — regenerate the telecom domain NATIVELY (fresh session)

The agentspec skill + the earlier (hand-driven) generated spec were **deliberately removed** so the domain
is regenerated the right way: the `agentspec` skill run **natively via the Skill tool**. The Skill tool only
registers skills present at **session start**, so:

```
   1. pnpm install
   2. cp .env.example .env   &&  fill GOOGLE_GENERATIVE_AI_API_KEY
   3. pnpm setup:skill       # npx skills add looprun-ai/looprun --skill agentspec  (installs to .claude/skills)
   4. pnpm setup:tau2        # the τ² harness into vendor/ (for the benchmark later)
   5. **open a NEW session at the repo root** so the Skill tool registers `agentspec`, then invoke it.
```

Then run the FULL AGENTS pipeline **through the skill** (do NOT hand-author — that's what we're undoing):

```
   agentspec pipeline (AGENTS):  A → G1 → G2 → G3 → E → N → T   then → benchmark
                                 ▶    (G1: tools already exist in reference/telecom → skip)
```

Inputs the skill needs are in `reference/telecom/` (`main_policy.md`, `tech_support_manual.md`,
`tool-schemas.json`). The generated artifacts land in `packages/telecom/`:
`src/agents/telecom/{spec,theme,lexicon,index}.ts`, `src/world/` (world + presets), `evals/`,
`looprun.eval.config.ts`, and — after the measured loop — `CERT.md`. They **replace** the current
placeholder `src/index.ts` (which exports the contract `telecomSupportSpec` / `THEME` / `TelecomWorld` the
shim consumes — keep that same export surface so `@looprun-bench/shim` keeps compiling).

**The pipeline must include stage T — the measured loop — before any benchmark:**
`looprun-eval run` → Claude judge → classify failures → fix (≤3 rounds) → `looprun-eval certify`
(N=3, ≥90%) → `CERT.md`. Subject = gemini-flash-lite (thinking-off). **An uncertified spec is not a valid
subject.**

## DONE (this session)
- Clean monorepo: pnpm workspaces, Apache-2.0, `docs/`, `CLAUDE.md`, `reference/telecom/`. Typechecks green.
- The τ²⇄looprun **shim** (`packages/shim`) — the reusable bridge (transcript ledger, world-adapter,
  step-handler, server). Wired to the telecom package's **placeholder** contract; re-verify it against the
  regenerated world's field names.

## AFTER the domain is certified
1. **Shim — cloud subject fix**: rebuild `packages/shim/src/subject-client.ts` cloud path to use looprun's
   NATIVE gemini (`geminiFlashLiteThinkOff()` from `looprun/models`) — the raw OpenAI-compat `fetch` path
   400s on Gemini-3 multi-turn tools (missing `thought_signature`). Local llama stays on fetch. (TODO in file.)
2. **Benchmark** (`packages/runner`): serve each subject, run `tau2 run --domain telecom` raw vs governed
   on the SAME split + user-sim, harvest the four metrics, commit `results/` + `docs/findings/results.md`.

## The benchmark run (once the spec is certified)

- **Harness:** `pnpm setup:tau2` → `vendor/tau2-bench`. There is NO `--agent-base-url` flag; pass
  `--agent-llm-args '{"api_base":...,"temperature":0,"chat_template_kwargs":{"enable_thinking":false}}'`.
  Task split flag: `--task-set-name telecom --task-split-name small` (the `telecom_small` shorthand hits a
  bug in this checkout). **`--max-steps 100`** (the tau2 DEFAULT — an earlier run used 30 and it was an
  artifact; see findings/results.md). `--num-trials 1 --max-concurrency 1`.
- **Subjects:** `qwen3.5-4b`, `qwen3.6-35b-a3b` (local, `looprun models serve`, one at a time — single GPU),
  `gemini-3.1-flash-lite` (cloud, thinking-off).
- **User-simulator:** `gemini/gemini-3.1-flash-lite --user-llm-args '{"temperature":0,"reasoning_effort":"none"}'`,
  FIXED across both arms (single-GPU forces the sim off-device; the raw absolute won't equal AA's board, but
  the raw→governed delta is valid — see findings/results.md caveats).
- **Metrics per arm** (from `results.json`): score = mean `reward_info.reward` (pass^1); output tokens/task
  = Σ assistant `completion_tokens`; cost/task = `agent_cost` ($0 local — label as local compute);
  time/task = mean `duration`. Plus the shim's activity JSONL (vetoes/redrives/abstains).

## Definition of done
A `docs/findings/results.md` table: raw vs +looprun per subject (the four metrics + delta), on the
**certified** spec, at `max_steps=100`, with the caveats stated honestly.
