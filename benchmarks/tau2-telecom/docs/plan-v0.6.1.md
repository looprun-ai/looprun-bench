# Plan — tau2-telecom edition **v0.6.1** (discard the 0.2.x skill round, regenerate on looprun@0.6.1, OpenRouter subjects)

> This is the current source of truth for tau2-telecom. It supersedes the "START HERE" block in
> [`roadmap.md`](roadmap.md) (which predates the restructure and the 0.6.1 runtime). Read `../../../CLAUDE.md`
> for the hard rules first.

## 0. Why a new round (what changed since the last round)

| axis | then (my round, commit `3333a7b`) | now |
|---|---|---|
| runtime | `looprun@0.2.1` / `@looprun-ai/eval@0.2.0` | **`looprun@0.6.1`** (runtime **P9**) — the atlas benchmark already certifies its anchors on it |
| layout | `packages/{telecom,shim,runner}` | **`benchmarks/tau2-telecom/harness/{telecom,shim,runner}`** (self-contained benchmark); results are **edition-first** (`results/v0.6.1/…`), mirroring `benchmarks/atlas/vX.Y.Z/` |
| cloud subject | Google key → `gemini-3.1-flash-lite-thinkoff` (+ the shim's raw OpenAI-compat `fetch` 400s on Gemini-3 multi-turn tools) | **OpenRouter** — one OpenAI-compatible endpoint, a multi-model cloud matrix (the atlas model spine: haiku-4.5, sonnet-5, ds-v4-pro/flash, gpt-5.x-nano, glm-4.7/5.2, kimi, gem-3.5-flash, minimax-m3, grok-4.3, …) |
| honesty guards | I **removed** `destructiveClaimRequiresSuccess` and `noFalseFailureClaim` — on the 0.2.x runtime they denied *truthful* claims / legitimate policy refusals and drove the exhaustion boilerplate | **P9 fixes those exact failure modes** — see §3; re-introduce and re-test them, don't assume they must be removed |

**P9 (looprun@0.6.1) — the two guard-tune fixes that matter here** (from `benchmarks/atlas/v0.6.1/README.md`):
1. a **prose-surfaced confirmation** now satisfies the two-step confirm-before-commit guard (previously only a
   structured re-call counted) — relevant because the τ² telecom tools have **no `confirmed` arg flag**, so
   confirmation is inherently prose-shaped;
2. a **policy-rejected probe keeps the honest-limit "ask" exemption** — this is *precisely* the misfire that
   made me drop `noFalseFailureClaim` (it tripped on a truthful "I can't resume, the bill is still overdue").

⟹ The 0.6.1 round is not a re-run of the same spec; it is a **regeneration** that can legitimately restore the
honesty layer the 0.2.x runtime couldn't support.

## 1. Decision: DISCARD the 0.2.x skill round

The generated bundle now living at `harness/telecom/` (`src/agents/telecom/{telecom-support-spec,theme,lexicon}.ts`,
`CERT.md`, `eval-results/`) is the **0.2.x** round. It was certified **48/51 = 94.1% N=3** against
`gemini-3.1-flash-lite-thinkoff`, but:
- it is pinned to `looprun ^0.2.1` and encodes **0.2.x workarounds** (both reply-honesty guards deleted) that
  P9 obsoletes;
- its CERT was measured on the Google-key gemini subject, not the OpenRouter matrix;
- the docs around it (`README.md`, `roadmap.md`) still describe a "placeholder / not generated" state — stale.

**Discard = do NOT benchmark it. Regenerate the spec/theme/lexicon/guards + CERT fresh on 0.6.1.** (Keep the
git history — the 0.2.x round stays as commit `3333a7b`; it is simply not the subject of the benchmark.)

## 2. Keep vs regenerate (reuse the domain material, redo the runtime-coupled parts)

| artifact | action | why |
|---|---|---|
| `reference/*` (policy, manual, tool-schemas) | **KEEP** | pure τ² domain source; unchanged |
| `harness/telecom/src/world/{tools,world,presets}.ts` | **KEEP, re-verify imports** | deterministic world + the 6 shim-contract accessors; only the `looprun` type imports (`ToolDef`/`AgentWorld`) may shift at 0.6.1 |
| `harness/telecom/evals/{cases.ts,judge-prompt.md}` | **KEEP as the ruler, re-validate** | 17 debate-validated cases + domain judge rules; re-run G3 debate only if the 0.6.1 skill changes the case shape |
| `harness/telecom/src/agents/telecom/{spec,theme,lexicon}.ts` | **REGENERATE (E2/E3)** | runtime-coupled; must re-test the P9 honesty guards instead of the 0.2.x removals |
| `harness/telecom/CERT.md`, `eval-results/` | **REGENERATE (T/S)** | new subject (OpenRouter) + new runtime |
| `harness/telecom/package.json` | **BUMP** `looprun`→`^0.6.1`, `@looprun-ai/eval`→ its 0.6.x line | + the shim/runner package.jsons + one lockfile (`pnpm -w up`) |
| `roadmap.md`, `README.md` (tau2-telecom) | **REFRESH** | remove the stale "not generated / placeholder" language once the 0.6.1 bundle lands |

> Firewall note: the atlas specs import `@neurono-bench/agentspec-runtime` because atlas is a **research
> export**, not run here. tau2-telecom runs **natively on the published package** — every generated file
> imports from `looprun` / `@looprun-ai/eval`. Never introduce the `@neurono-bench/*` import (the legacy
> lineage token — CLAUDE.md firewall).

## 3. Regenerate the domain on 0.6.1 (the AGENTS pipeline, via the skill, in a fresh session)

The Skill tool only registers skills present at session start, so run this in a **new session at repo root**
after `pnpm setup:skill`. Pipeline: **A → (G1 skip: tools exist) → G2 → G3 → E → N → T → S**, executed through
independent subagents (never hand-authored). Inputs live in `benchmarks/tau2-telecom/reference/`.

Deltas vs the 0.2.x run to bake in from the start (measured lessons this domain already taught us):
- **Re-introduce the honesty layer and let the measured loop judge it on P9** — a `noFalseFailureClaim`
  (via `cfg.lexicon.falseFailureClaimRe`) and, if a prose-confirmation mechanism fits the flag-less τ² tools,
  `destructiveClaimRequiresSuccess` / `pendingConfirmMustAsk`. P9 fix #2 should stop the policy-refusal misfire;
  P9 fix #1 should let prose confirmation satisfy the two-step guard. **Verify by measurement, not assumption.**
- **Keep the deterministic action-layer gates** that already worked (identify-first, overdue-before-request,
  one-awaiting-payment, the two resume gates, refuel≤2GB, `argRequired` incl. `dob`) — these are the value.
- **Keep the state-visibility fix**: `theme.stateBlock` renders only VERIFIED customers (no DB leak /
  fabrication-by-readback).
- **Preserve the shim export contract** (`telecomSupportSpec` / `THEME` / `TelecomWorld` with its 7 accessors)
  so `harness/shim` keeps compiling.
- Bar unchanged: **≥90% Claude-judged, N=3**. An uncertified spec is not a valid subject.

## 4. OpenRouter wiring (replaces the Google key + the gemini-native shim fix)

OpenRouter is an **OpenAI-compatible** endpoint, so it drops into the paths that already exist — this makes the
old roadmap item "rebuild the shim cloud path for gemini `thought_signature`" **mostly moot** for OpenRouter
models. Three consumers:

1. **The shim subject** (`harness/shim/src/subject-client.ts` already reads env — no code change needed for the
   happy path):
   ```
   LOOPRUN_SUBJECT_API_BASE=https://openrouter.ai/api/v1
   LOOPRUN_SUBJECT_API_KEY=$OPENROUTER_API_KEY
   LOOPRUN_SUBJECT_MODEL=<openrouter model id, e.g. anthropic/claude-haiku-4.5>
   # per-model extras (thinking-off etc.) via LOOPRUN_SUBJECT_EXTRA_BODY
   ```
   Verify at execution: whether any OpenRouter model still needs provider-specific multi-turn-tool handling
   (the Gemini `thought_signature` issue) — if so, route only that model through `looprun/models`, keep the
   rest on the OpenAI-compat fetch.
2. **The measured-loop subject** (`looprun.eval.config.ts` `model` field): point it at an OpenRouter model via
   the 0.6.x `@looprun-ai/eval` model-resolve (registry alias or a pre-built AI-SDK OpenRouter model). Confirm
   the 0.6.x CLI's OpenRouter support / the `model-resolve` surface when regenerating.
3. **The τ² user-simulator + tau2's agent-llm-args** (`harness/runner`): pass OpenRouter `api_base` + key +
   model to `tau2 run` (`--agent-llm-args`, `--user-llm-args`). Hold the **user-simulator model fixed** across
   both arms (paired protocol).

Env: add `OPENROUTER_API_KEY` to `.env` + `.env.example`. Keep `GOOGLE_GENERATIVE_AI_API_KEY` only if a gemini
model is still used for the judge/sim; otherwise the round is OpenRouter-only. **Judge stays Claude, held
constant** across the whole matrix (ruler discipline) — an OpenRouter Claude model or the existing Claude judge.

## 5. Edition-first results (mirror atlas)

Produce a **`v0.6.1` edition** for tau2-telecom, matching `benchmarks/atlas/v0.6.1/`:
- results under `benchmarks/tau2-telecom/results/v0.6.1/<date>-<subject|arm>-rep{0,1,2}/…` (per-agent
  `*.verdicts.jsonl` + `*.dump.autofail.json`), never retro-edited;
- a `results/v0.6.1/README.md` with the certified anchor(s) + the raw-vs-governed matrix + the honest caveats;
- the certified spec bundle for this edition kept with it (or referenced from `harness/telecom` at the pinned
  version). Follow the atlas **versioning LAW**: published numbers are frozen; a new edition = a new `vX.Y.Z/`.

## 6. The benchmark run (once the 0.6.1 spec is CERTIFIED)

Paired protocol, identical τ² tasks + user-simulator, **raw model vs model+looprun**:
- Harness: `pnpm setup:tau2` → `benchmarks/tau2-telecom/vendor/tau2-bench`.
  `--task-set-name telecom --task-split-name small`, **`--max-steps 100`**, `--num-trials 1 --max-concurrency 1`.
- **Subjects (OpenRouter matrix)**: start with the atlas cloud spine (a Claude tier, a GPT-nano tier, a couple
  of open-weights) so the tau2 delta is comparable to atlas's +3.9 governance result; optionally keep one local
  quantized subject (`looprun models serve`) as a cross-check.
- **User-simulator**: one fixed OpenRouter model, `temperature:0`, reasoning-off — same in both arms.
- **Metrics per arm** (from `results.json`): score = mean `reward_info.reward`; output tokens/task = Σ assistant
  `completion_tokens`; cost/task = `agent_cost` (OpenRouter gives a real cloud $ figure — a genuine cost axis
  now, unlike the local $0); time/task = mean `duration`. Plus the shim activity JSONL (vetoes/redrives/abstains).
- **Evaluate before the next run** (CLAUDE.md): harvest + root-cause each arm before launching the next.

## 7. Definition of done

`docs/findings/results.md` (+ `results/v0.6.1/README.md`): raw vs +looprun **per OpenRouter subject** — the four
metrics + delta — on the **0.6.1-certified** spec, `max_steps=100`, judge held constant, with the paired-protocol
caveats stated honestly (subject varied, judge fixed; never compare across subjects).

## 8. Open questions to resolve at execution (don't guess — verify)

1. Exact `@looprun-ai/eval` 0.6.x version + any CLI/`EvalConfig`/`model-resolve` changes vs 0.2.0 (the 0.2.x
   config shape may have drifted).
2. OpenRouter model ids + which need thinking-off / special multi-turn-tool handling.
3. Whether the 0.6.1 `AgentSpecBase` / guard signatures changed (regenerate against the installed 0.6.1 `.d.ts`,
   as the last round did against 0.2.1).
4. Does any OpenRouter model reproduce the `thought_signature` multi-turn-tool 400 (then that model, and only it,
   needs the native-provider path)?
5. Judge model choice on OpenRouter (a Claude tier) held byte-constant across the matrix.
