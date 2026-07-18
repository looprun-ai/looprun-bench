# Atlas — edition v0.6.0 (looprun@0.6.0)

> This is the **v0.6.0 edition** of the Atlas benchmark — a self-contained measurement snapshot pinned
> to npm `looprun@0.6.0` (GitHub `v0.6.0`). For what Atlas is and the edition index, see
> [`../README.md`](../README.md). Per the never-retro-edit LAW, nothing here is edited by a later edition.

## Install & run

This edition is a **standalone npm package** (`@looprun-bench/atlas-v0.6.0`, private) with its own
exact-pinned `package.json`, its own committed `pnpm-lock.yaml`, and a **frozen copy of the harness**
under [`harness/`](harness/) — you `cd` into it and install; nothing else in the repo is needed.

**Prerequisites:** Node ≥ 22, pnpm 10.33.0 (`corepack enable` picks it up from `packageManager`).

```bash
cd benchmarks/atlas/v0.6.0
pnpm install                      # exact pins: looprun@0.6.0 + @mastra/core@1.50.1 (frozen lockfile)
cp .env.example .env              # then fill in the keys (see below)
```

**Configure the subject + judge** (`.env`) — the run scripts read `process.env`, so export them first
(`set -a; source .env; set +a`) or set them inline. Minimum: a **subject** key + (to judge) a **judge**
model id + key. Full var list is in [`.env.example`](.env.example).

```bash
# subject: Google Gemini (the published cloud subject)
export GOOGLE_GENERATIVE_AI_API_KEY=...   MODEL_ID=gemini-3.1-flash-lite   THINKING=off
# …or any OpenAI-compatible endpoint:
#   export PROVIDER=openai-compatible OPENAI_BASE_URL=http://localhost:8080/v1 OPENAI_API_KEY=... MODEL_ID=...
```

**Smoke — 3 cases** (includes a two-step confirm), then the **full 61**, N=3:

```bash
pnpm run:governed   --cases 01,07,68 --out runs/smoke     # tool calls execute; dumps under runs/smoke/rep0/
pnpm run:governed   --out runs/gov --reps 3               # governed arm, full subject, N≥3 to certify
pnpm run:ungoverned --out runs/van --reps 3               # ungoverned control arm (same model + cases)
```

**Judge + score** (the only quality verdict):

```bash
# judge via an Anthropic OR any OpenAI-compatible endpoint (incl. Gemini's OpenAI-compat API):
export JUDGE_PROVIDER=openai \
  JUDGE_OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai \
  JUDGE_API_KEY=$GOOGLE_GENERATIVE_AI_API_KEY JUDGE_MODEL_ID=gemini-3.1-flash-lite
pnpm judge --dir runs/gov       # writes <agent>.verdicts.jsonl next to each dump
pnpm score --dir runs/gov       # pass-rate per rep + the mean
```

**Order-of-magnitude cost/time:** the full 61 cases × 1 rep is ~1–3 min of wall time and a few cents of
subject-model spend on a hosted flash-tier model (N=3 ≈ 3×); judging adds one judge call per non-autofail
case. A local OpenAI-compatible endpoint costs only its own compute.

> **Judge-comparability warning.** The published edition numbers were produced by a **single
> held-constant judge** ("ruler-v2", a frontier coding agent). A reproduction on a **different judge
> model** (e.g. Gemini as judge above) is **informative, not directly comparable** — and a lightweight
> judge can be noisy (it may occasionally return an empty verdict). Diff your `runs/**/…verdicts.jsonl`
> against the published [`results/`](results/) case by case, and read the headline figures from those.

---

**Atlas Equipment Rentals & Field Ops** is a single, plausible business used as the ruler for the
**governance-vs-traditional** agent comparison. It is **5 agents** (`at-rentals` / `at-billing` /
`at-claims` / `at-inventory` / `at-admin`), **61 cases**, **54 tools** — one business deliberately
shaped to force every guard-relevant risk class (checkable money arithmetic, irreversible two-step
actions, cross-agent state gates, PII/compliance, multi-tenancy quotas).

Atlas was **generated end-to-end from one purpose sentence** by the `agentspec` skill (the same skill
this repo uses for the telecom subject) — the world, the tools, the agents/guards, and the eval set
were all auto-authored, then iterated against a measured bar. It is the ruler for the
**looprun (governed) vs traditional (ungoverned)** comparison and for the cloud-model matrix.

## Provenance

Atlas was authored and certified with the `agentspec` skill and run on the published looprun runtime
(**`@looprun-ai/core`** / npm **`looprun` 0.6.0**). This directory is a **self-contained export**:
the subject, the specs, the ungoverned control arm, curated result verdicts, and the internal reports.
Curated verdicts + dumps for every run are under [`results/README.md`](results/README.md).

Every verdict in this benchmark — both arms — is scored by **the LLM judge (a frontier coding agent)**
against a fixed rubric ("ruler-v2"). The subject-under-test model is varied (13 cloud models plus a
local quantized model); the judge is held constant. Never mix rulers; never compare across subjects.

## Headline results

Certified anchors (ruler-v2):

| arm | FL (flash-lite-thinkoff, cloud subject) | local quantized (Qwen3.6-35B-A3B, IQ2_XXS) |
|---|---|---|
| **looprun / governed** (`atlas-r2`) | **100%** N=3 | **91.8%** (perturbed band 56/61; byte-identical 93.4 over-counts) |
| traditional / ungoverned v2 (cloud-opt) | 98.4% (60/61) | — |
| traditional / ungoverned v3 (local-opt) | — | 86.9% (53/61) |

Cloud tier — **13 OpenRouter models, N=3**:

> **looprun (governed) aggregate 96.5 vs traditional (ungoverned) 92.6** — governance +3.9 pt,
> 11/13 per-model wins, and **all** risk-class incidents (money/irreversible/PII) fell on the
> ungoverned arm. Full breakdown: [`docs/vanilla-cloud-matrix-2026-07-18.md`](docs/vanilla-cloud-matrix-2026-07-18.md).

## Layout of this export

| dir | what |
|---|---|
| [`harness/`](harness/) | the **frozen per-edition runner** (`src/*.ts`) — governed + ungoverned arms, judge, score; driven by the edition's own `package.json` scripts (`pnpm run:governed` / `run:ungoverned` / `judge` / `score`). See **Install & run** at the top |
| [`subject/`](subject/) | the ruler — `world.ts`, `tools.ts`/`.json`, `presets.ts`, the 61 cases (`cases-at-*.ts`), `judge-prompt.md`, `WORLD-MODEL.md`, `AGENT-MAP.md`, `EVALS*.md`, `G1-REVIEW.md` |
| [`specs/`](specs/) | the governed (looprun) AgentSpec bundles: `atlas/` (base + `CASE-MAP.tsv`), `atlas-r2/`+`atlas-r2p/` (certified v2), `atlas-p-<model>/` (per-model form profiles), `atlas-band-p1..3/` (perturbed-band bundles for honest local cert) |
| [`vanilla/`](vanilla/) | the ungoverned control arm (blind-authored traditional agent): `BRIEF.md`, `agents-generated/atlas/` (provenance + iteration ledger + `index.ts`/`v2` bundles + bug reports) |
| [`results/`](results/) | curated verdicts/dumps per run family for this edition — see [`results/README.md`](results/README.md) and the edition index in [`../README.md`](../README.md) |
| [`docs/`](docs/) | the internal research reports (verbatim, provenance-headed): GO/NO-GO, the cloud matrix, flip-root-cause, regen report, compaction A/B |

## How to re-run

The runner is **frozen inside this edition** ([`harness/`](harness/)) — it plays this exported subject
through both arms, judges, and scores, reproducibly from this directory alone. Install + the smoke are
in **Install & run** at the top; the fuller invocations:

```bash
cd benchmarks/atlas/v0.6.0 && pnpm install

# --- governed (looprun) arm + traditional (ungoverned "vanilla") control arm ---
# one cloud model, whole subject, N=3:
MODEL_ID=gemini-3.1-flash-lite THINKING=off pnpm run:governed   --reps 3
MODEL_ID=gemini-3.1-flash-lite THINKING=off pnpm run:ungoverned --reps 3

# --- local arm (quantized Qwen3.6-35B-A3B via a looprun/llama.cpp server) ---
# point the harness at an OpenAI-compatible endpoint:
OPENAI_BASE_URL=http://127.0.0.1:8081/v1 MODEL_ID=qwen3.6-35b-a3b pnpm run:governed

# --- judging (the only quality verdict) + scoring ---
pnpm judge --dir runs/gov
pnpm score --dir runs/gov
```

Local certification is a **perturbed band**, not a single N: K=3 replicates that perturb only inert
bytes, reporting min/median/max + the flip-list (byte-identical reps are the N=1 trap). See
[`docs/flip-root-cause-2026-07-16.md`](docs/flip-root-cause-2026-07-16.md) Part 8.

The streaming `→ pass/fail` lines are the invariant gate, **not** quality — the LLM-judge verdict is.
