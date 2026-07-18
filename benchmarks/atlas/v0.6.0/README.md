# Atlas — edition v0.6.0 (looprun@0.6.0)

> This is the **v0.6.0 edition** of the Atlas benchmark — a self-contained measurement snapshot pinned
> to npm `looprun@0.6.0` (GitHub `v0.6.0`). For what Atlas is and the edition index, see
> [`../README.md`](../README.md). Per the never-retro-edit LAW, nothing here is edited by a later edition.

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

Measured on the **neurono-bench** harness — the `s15` runtime there is the canonical source mirrored
as **`@looprun-ai/core`** / npm **`looprun` 0.6.0**. This directory is an **export** of that research:
the subject, the specs, the ungoverned control arm, curated result verdicts, and the internal reports.
Raw per-run traces stay in the canonical repo; see [`results/README.md`](results/README.md).

Every verdict in this benchmark — both arms — is scored by **the LLM judge (a frontier coding agent)**
against a fixed rubric ("ruler-v2"). The subject-under-test model is varied (13 cloud models plus a
local quantized model); the judge is held constant. Never mix rulers; never compare across subjects.

## Headline results

Certified anchors (ruler-v2):

| arm | FL (flash-lite-thinkoff, cloud subject) | ram24 (local quantized) |
|---|---|---|
| **looprun / governed** (`atlas-r2`) | **100%** N=3 | **91.8%** (perturbed band 56/61; byte-identical 93.4 over-counts) |
| traditional / ungoverned v2 (cloud-opt) | 98.4% (60/61) | — |
| traditional / ungoverned v3 (ram24-opt) | — | 86.9% (53/61) |

Cloud tier — **13 OpenRouter models, N=3**:

> **looprun (governed) aggregate 96.5 vs traditional (ungoverned) 92.6** — governance +3.9 pt,
> 11/13 per-model wins, and **all** risk-class incidents (money/irreversible/PII) fell on the
> ungoverned arm. Full breakdown: [`docs/vanilla-cloud-matrix-2026-07-18.md`](docs/vanilla-cloud-matrix-2026-07-18.md).

## Layout of this export

| dir | what |
|---|---|
| [`subject/`](subject/) | the ruler — `world.ts`, `tools.ts`/`.json`, `presets.ts`, the 61 cases (`cases-at-*.ts`), `judge-prompt.md`, `WORLD-MODEL.md`, `AGENT-MAP.md`, `EVALS*.md`, `G1-REVIEW.md` |
| [`specs/`](specs/) | the governed (looprun) AgentSpec bundles: `atlas/` (base + `CASE-MAP.tsv`), `atlas-r2/`+`atlas-r2p/` (certified v2), `atlas-p-<model>/` (per-model form profiles), `atlas-band-p1..3/` (perturbed-band bundles for honest local cert) |
| [`vanilla/`](vanilla/) | the ungoverned control arm (blind-authored traditional agent): `BRIEF.md`, `index.ts` (neutral adapter, reference only), `agents-generated/atlas/` (provenance + iteration ledger + `index.ts`/`v2` bundles + bug reports) |
| [`results/`](results/) | curated verdicts/dumps per run family for this edition — see [`results/README.md`](results/README.md) and the edition index in [`../README.md`](../README.md) |
| [`docs/`](docs/) | the internal research reports (verbatim, provenance-headed): GO/NO-GO, the cloud matrix, flip-root-cause, regen report, compaction A/B |

## How to re-run

The Atlas harness lives in the **canonical `neurono-bench` repo** (not this repo). The commands below
run there. `<agent>` dumps are then scored by the LLM judge to produce `<agent>.verdicts.jsonl`.

```bash
# --- governed (looprun / s15) arm ---
# whole subject, one cloud model:
scripts/s15-run-set.sh full gemini-3.1-flash-lite-thinkoff atlas
# cloud matrix over a model group or explicit list (one results dir per model):
scripts/s15-run-models.sh full "or-haiku-4.5,or-sonnet-5" atlas

# --- traditional (ungoverned "vanilla") control arm ---
scripts/vanilla-run-set.sh full gemini-3.1-flash-lite-thinkoff atlas
scripts/vanilla-run-models.sh full "or-haiku-4.5,or-sonnet-5,..." atlas
NB_VANILLA_SUFFIX=-rep1 scripts/vanilla-run-models.sh full "<models>" atlas   # N=3 replicates

# --- local arm (ram24 = quantized Qwen3.6-35B-A3B on llama.cpp) ---
pnpm serve qwen3.6-35b-3b-gguf
export OLLAMA_BASE_URL=http://127.0.0.1:8081/v1
scripts/vanilla-run-set.sh full qwen36-local atlas

# --- judging (the only quality verdict) ---
# the LLM judge scores each <agent>.dump.tasks.jsonl → <agent>.verdicts.jsonl, folded with:
node bench/scripts/claude-judge-merge.mjs <dir>/<agent>.dump.json <dir>/<agent>.verdicts.jsonl \
  <dir>/<agent>.dump.autofail.json <dir>/<agent>.judged.json

# --- cost ---
node bench/scripts/cost-report.mjs bench/results/<dir> [...]
```

Local certification is a **perturbed band**, not a single N: K=3 replicates that perturb only inert
bytes, reporting min/median/max + the flip-list (byte-identical reps are the N=1 trap). See
[`docs/flip-root-cause-2026-07-16.md`](docs/flip-root-cause-2026-07-16.md) Part 8.

The streaming `→ pass/fail` lines are the invariant gate, **not** quality — the LLM-judge verdict is.
