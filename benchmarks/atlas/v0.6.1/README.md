# Atlas — edition v0.6.1 (looprun@0.6.1)

> A **patch edition** over [`v0.6.0/`](../v0.6.0/README.md). It re-certifies the anchors on a patched
> runtime and **inherits** the 13-model cloud matrix unchanged. For what Atlas is and the edition index,
> see [`../README.md`](../README.md). Per the never-retro-edit LAW, this edition does not touch any
> v0.6.0 number.

## Install & run

This edition is a **standalone npm package** (`@looprun-bench/atlas-v0.6.1`, private) with its own
exact-pinned `package.json` and a **frozen copy of the harness** under [`harness/`](harness/). It owns
this edition's **P9-patched governed specs** ([`specs/atlas-r2/`](specs/atlas-r2/)); its **subject** and
**ungoverned control arm** are **inherited from [`../v0.6.0/`](../v0.6.0/)** (not duplicated — the
harness resolves them across the sibling dir by default, which works from this edition's own install).

> **Pins target [`looprun@0.6.1`](https://github.com/looprun-ai/looprun/releases/tag/v0.6.1)
> (published 2026-07-18).** The two runtime deps (`@looprun-ai/core` / `@looprun-ai/mastra`) are
> pinned to **exact `0.6.1`** and the committed `pnpm-lock.yaml` resolves them from npm. The
> maintainers verified this edition end-to-end twice on 2026-07-18: against the packed `0.6.1`
> runtime pre-publish, and against the published npm `0.6.1` post-publish (typecheck + governed +
> ungoverned smokes + judge + score, artifact shapes matching [`results/`](results/)).

**Prerequisites:** Node ≥ 22, pnpm 10.33.0.

```bash
cd benchmarks/atlas/v0.6.1
pnpm install                      # resolves once looprun@0.6.1 is published; writes the lockfile
cp .env.example .env              # fill in the subject + judge keys — see below

# subject + judge (export before running; the scripts read process.env):
export GOOGLE_GENERATIVE_AI_API_KEY=...   MODEL_ID=gemini-3.1-flash-lite   THINKING=off

pnpm run:governed   --cases 01,07,68 --out runs/smoke     # 3-case smoke (incl. a two-step confirm)
pnpm run:governed   --out runs/gov --reps 3               # governed arm, full 61, N=3
pnpm run:ungoverned --out runs/van --reps 3               # ungoverned control arm

export JUDGE_PROVIDER=openai \
  JUDGE_OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai \
  JUDGE_API_KEY=$GOOGLE_GENERATIVE_AI_API_KEY JUDGE_MODEL_ID=gemini-3.1-flash-lite
pnpm judge --dir runs/gov         # the only quality verdict
pnpm score --dir runs/gov         # pass-rate per rep + mean
```

The full var list (subject / judge / optional artifact overrides) is in [`.env.example`](.env.example).
**Order-of-magnitude cost/time:** ~1–3 min + a few cents of subject-model spend per full-61 rep on a
hosted flash-tier model (N=3 ≈ 3×); judging adds one judge call per non-autofail case.

> **Judge-comparability warning.** The published anchors were scored by a **single held-constant judge**
> ("ruler-v2", a frontier coding agent). A reproduction on a **different judge model** (e.g. Gemini as
> judge above) is **informative, not directly comparable**, and a lightweight judge can be noisy (it may
> occasionally return an empty verdict). Read the headline figures from [`results/`](results/) and diff
> your `runs/**/…verdicts.jsonl` against them case by case.

## What changed

Runtime **P9** in **`looprun@0.6.1`** — two guard-tune fixes, promoted after a per-case forensic campaign:

1. A **prose-surfaced confirmation** now counts as the two-step probe: when the agent surfaces the
   pending irreversible action in prose and the user confirms, that satisfies the confirm-before-commit
   guard (previously only a structured re-call was accepted).
2. A **policy-rejected probe** keeps the honest-limit **ask exemption**: when a probe is refused by
   policy, the agent may still make the honest "I can't do X" ask without tripping the guard.

Plus **confirmed prose refinements** in the governed specs (`specs/atlas-r2/`), promoted from the same
campaign. The subject, the ungoverned control arm, and the eval docs are **unchanged** and are **not
duplicated** here — see [`../v0.6.0/`](../v0.6.0/README.md).

## Anchors — re-certified N=3 (ruler-v2)

Both anchors were re-measured on the patched runtime. Every verdict is scored by the same held-constant
LLM judge. Curated verdicts + deterministic autofails live under [`results/`](results/).

| anchor | subject | result | notes |
|---|---|---|---|
| **cloud subject** | flash-lite-thinkoff | **98.4** (60/61, N=3) | its single failing case is a **proven knife-edge of the subject model** — byte-identical prompt vs v0.6.0, a same-day re-probe lands ~50/50; the v0.6.0 **100** stands for its edition |
| **local quantized** | Qwen3.6-35B-A3B (IQ2_XXS, llama.cpp, **speculative decoding ON**) | **95.6 — local record** | best local result to date on Atlas |
| package validation | weakest cloud model (gpt-*-nano) | **88.0 → 91.8** (N=3) | confirms the P9 fixes carry to the weakest model, not just the anchors |

`results/` families:

| family | dirs | what |
|---|---|---|
| `2026-07-18-p9recert-fl-rep{0,1,2}` | 3 | cloud-subject (flash-lite) re-cert — the **98.4** anchor |
| `2026-07-18-p9recert-ram24-rep{0,1,2}` | 3 | local-quantized (spec-decode ON) re-cert — the **95.6** local record |
| `2026-07-18-fix2nano-full61-rep{0,1,2}` | 3 | weakest-cloud-model package validation — **88.0 → 91.8** |

Each rep dir keeps the per-agent `*.verdicts.jsonl` (raw LLM-judge verdicts) + `*.dump.autofail.json`
(deterministic invariant-gate autofails, folded into the score).

## NOT re-measured

- **The 13-model cloud matrix** (governed 96.5 × ungoverned 92.6). P9 is a guard-tune that only affects
  the certified anchors; the matrix numbers are **inherited from v0.6.0 unchanged** — read them from
  [`../v0.6.0/`](../v0.6.0/README.md), never re-attributed to this edition.

## Unchanged artifacts (not duplicated — see v0.6.0)

Only what P9 re-touched is exported here (the patched `atlas-r2` specs + the anchor-recert results).
Everything else is identical to v0.6.0 and lives there:

| artifact | where |
|---|---|
| the subject (world, tools, 61 cases, judge prompt, world model) | [`../v0.6.0/subject/`](../v0.6.0/subject/) |
| the ungoverned / traditional control arm | [`../v0.6.0/vanilla/`](../v0.6.0/vanilla/) |
| the internal research reports (GO/NO-GO, cloud matrix, flip-root-cause, …) | [`../v0.6.0/docs/`](../v0.6.0/docs/) |
| the full spec bundle set (base, per-model profiles, perturbed band) | [`../v0.6.0/specs/`](../v0.6.0/specs/) |
| the full cloud-matrix + local-band result families | [`../v0.6.0/results/`](../v0.6.0/results/) |

## Provenance

Re-certified with the `agentspec` skill on the published looprun runtime (`@looprun-ai/core` /
npm `looprun@0.6.1`). This directory is a self-contained export of that re-certification; curated
verdicts + deterministic autofails live under [`results/`](results/).
