# Atlas — edition v0.6.1 (looprun@0.6.1)

> A **patch edition** over [`v0.6.0/`](../v0.6.0/README.md). It re-certifies the anchors on a patched
> runtime and **inherits** the 13-model cloud matrix unchanged. For what Atlas is and the edition index,
> see [`../README.md`](../README.md). Per the never-retro-edit LAW, this edition does not touch any
> v0.6.0 number.

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
| **local quantized** | ram24 (Qwen3.6-35B-A3B, llama.cpp, **speculative decoding ON**) | **95.6 — local record** | best local result to date on Atlas |
| package validation | weakest cloud model (gpt-*-nano) | **88.0 → 91.8** (N=3) | confirms the P9 fixes carry to the weakest model, not just the anchors |

`results/` families:

| family | dirs | what |
|---|---|---|
| `2026-07-18-p9recert-fl-rep{0,1,2}` | 3 | cloud-subject (flash-lite) re-cert — the **98.4** anchor |
| `2026-07-18-p9recert-ram24-rep{0,1,2}` | 3 | local-quantized (ram24, spec-decode ON) re-cert — the **95.6** local record |
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

Measured on the canonical **neurono-bench** harness (`s15` runtime, mirrored as `@looprun-ai/core` /
npm `looprun@0.6.1`). This directory is an export of that research; raw per-run traces stay in the
canonical repo.
