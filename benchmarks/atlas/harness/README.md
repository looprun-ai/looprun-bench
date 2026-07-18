# Atlas harness — reproduce the benchmark

A standalone, public runner for the Atlas **governance-vs-traditional** benchmark. It plays the
exported subject (the world + the 61 cases) through two arms on the *same* model + *same* cases, then
judges and scores them:

- **governed** — the model driven through the **looprun** runtime: the bucket's `AgentSpec` +
  deterministic guards + the domain theme are active (`runSpecConversation` from the public
  `@looprun-ai/mastra`).
- **ungoverned** — the same model in a plain **Mastra** agent (`@mastra/core`): the control bundle's
  static instructions, the subject's tools wired straight to the world, no guards.

It depends only on public packages (`@looprun-ai/core`, `@looprun-ai/mastra`, `@mastra/core`, `ai`,
`zod`, and an AI-SDK provider) plus the exported edition artifacts in the sibling `v0.6.x/`
directories — so the benchmark is reproducible from this repo alone.

> The published edition numbers were produced by the maintainers on a pinned looprun release and a
> **single held-constant judge** ("ruler-v2"). This harness reproduces the *methodology* and the
> per-case artifacts; a reproduction on a different judge model (or a different runtime patch level)
> is informative, **not** a byte-for-byte match of the published figure.

## What it reads

| artifact | default location | override env |
|---|---|---|
| governed spec bundle (`SPECS` + `THEME`) | `../v0.6.1/specs/atlas-r2/index.ts` | `SPECS_BUNDLE` |
| subject (world, tools, 61 cases, judge prompt) | `../v0.6.0/subject/` | `SUBJECT_DIR` |
| ungoverned control bundle (`AGENTS`) | `../v0.6.0/vanilla/agents-generated/atlas/index.ts` | `VANILLA_BUNDLE` |

The exported spec bundles carry a build-time runtime import; the harness maps it onto the public
`@looprun-ai/core` at load time, so the frozen artifacts run unchanged.

## 5-minute quickstart

**1. Install** (from the repo root):

```bash
pnpm install
```

**2. Set two env vars** — the subject model + its key. Either provider works:

```bash
# Option A — Google Gemini (the published cloud subject)
export GOOGLE_GENERATIVE_AI_API_KEY=...      # your Google AI Studio key
export MODEL_ID=gemini-3.1-flash-lite        # PROVIDER defaults to google for gemini* ids

# Option B — any OpenAI-compatible endpoint (a local llama.cpp / vLLM / ollama server, or a hosted API)
export PROVIDER=openai-compatible
export OPENAI_BASE_URL=http://localhost:8080/v1
export OPENAI_API_KEY=not-needed             # or your key
export MODEL_ID=<the served model id>
```

All runs are thinking-off (`THINKING=off`) and temperature 0 by default — the published convention.

**3. Smoke — 3 cases** (from `benchmarks/atlas/harness/`):

```bash
pnpm run:governed --cases 01,07,83 --out runs/smoke
```

You should see each case execute tool calls and the per-agent dumps written under
`runs/smoke/rep0/`.

**4. Full 61 cases** (governed arm):

```bash
pnpm run:governed --out runs/gov --reps 1
```

**5. Judge** — grade the run with a judge model:

```bash
# Anthropic judge
export JUDGE_PROVIDER=anthropic
export ANTHROPIC_API_KEY=...
export JUDGE_MODEL_ID=<a Claude model id>

# …or an OpenAI-compatible judge (incl. Gemini's OpenAI-compatible endpoint)
export JUDGE_PROVIDER=openai
export JUDGE_OPENAI_BASE_URL=https://api.openai.com/v1
export JUDGE_API_KEY=...
export JUDGE_MODEL_ID=<the judge model id>

pnpm judge --dir runs/gov
```

**6. Score** — pass-rate per rep + the mean:

```bash
pnpm score --dir runs/gov
```

For the ungoverned control arm, swap `run:governed` → `run:ungoverned` (everything else identical), then
judge + score its output dir. Compare the two pass-rates — the delta is what governance added.

## Flags (both run scripts)

| flag | meaning |
|---|---|
| `--cases 01,07,62` | run only these cases (full id, `NN-...` prefix, or the `NN` code); comma-repeatable |
| `--agent at-billing` | run only this agent bucket (governed ids `at-*`; ungoverned ids `rentals/billing/fleet/claims/admin`) |
| `--reps 3` | repeat the whole set N times (written to `rep0/`, `rep1/`, …); certify with N≥3 |
| `--out DIR` | output directory (default `runs/<arm>-<timestamp>`) |

## Env reference

| env | default | meaning |
|---|---|---|
| `MODEL_ID` | `gemini-3.1-flash-lite` | subject model id |
| `PROVIDER` | inferred | `google` or `openai-compatible` |
| `THINKING` | `off` | `off` \| `low` \| `medium` \| `high` |
| `TEMPERATURE` | google: unset · openai-compatible: `0` | sampling temperature |
| `MAX_OUTPUT` | `2048` | max output tokens |
| `GOOGLE_GENERATIVE_AI_API_KEY` | — | key for the google provider |
| `OPENAI_BASE_URL` / `OPENAI_API_KEY` | — | endpoint + key for the openai-compatible provider |
| `VANILLA_MAX_STEPS` | `16` | ungoverned arm step budget (parity with the governed default) |
| `JUDGE_PROVIDER` | inferred | `anthropic` or `openai` |
| `JUDGE_MODEL_ID` | — | judge model id (required to judge) |
| `ANTHROPIC_API_KEY` | — | key for the anthropic judge |
| `JUDGE_OPENAI_BASE_URL` / `JUDGE_API_KEY` | — | endpoint + key for the openai-compatible judge |
| `JUDGE_CONCURRENCY` | `4` | parallel judge calls |
| `SPECS_BUNDLE` / `SUBJECT_DIR` / `VANILLA_BUNDLE` | see table above | point the harness at a different edition |

## Output layout (matches the exported result format)

```
<out>/rep<N>/
  <agent>.dump.json          full per-case record (reply + trace + calls + invariant gate)
  <agent>.dump.tasks.jsonl   one line per case to judge: {caseId, rep, rubric, actualReply, actualTrace, actualCalls, …}
  <agent>.dump.autofail.json deterministic invariant-gate auto-fails: [{caseId, rep, reason}]
  <agent>.verdicts.jsonl     judge output: {caseId, rep, verdicts:[{id, pass, reasoning}], overall}
```

The final verdict per case = the deterministic invariant gate (auto-fail) folded with the LLM-judge
ruling: a case fails if it auto-failed **or** the judge ruled it fail. Diff these files against the
published `../v0.6.x/results/` verdicts to compare your reproduction, case by case.
