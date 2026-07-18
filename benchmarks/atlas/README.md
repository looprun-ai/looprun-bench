# Atlas — the governance-vs-traditional benchmark

**Atlas Equipment Rentals & Field Ops** is a single, plausible business used as the ruler for the
**governance-vs-traditional** agent comparison — **5 agents** (`at-rentals` / `at-billing` /
`at-claims` / `at-inventory` / `at-admin`), **61 cases**, **54 tools** — one business deliberately
shaped to force every guard-relevant risk class (checkable money arithmetic, irreversible two-step
actions, cross-agent state gates, PII/compliance, multi-tenancy quotas). It was **generated
end-to-end from one purpose sentence** by the `agentspec` skill, then iterated against a measured bar.

The benchmark pairs the *same* subject model, on the *same* 61 cases + the *same* held-constant LLM
judge ("ruler-v2"), in two arms — **model + looprun governance** vs **the raw/traditional model** — so
the delta is exactly what the governance layer added. The subject-under-test model is varied (a cloud
matrix plus a local quantized model); the judge is held constant. Never mix rulers; never compare
numbers across subjects.

## Editions

Each **edition** is a self-contained measurement snapshot pinned to a published **looprun release**
(npm `looprun@X.Y.Z` + the matching GitHub tag). It bundles the subject, the specs, the control arm,
and the curated result verdicts that produced its published numbers — everything lives in its own
`vX.Y.Z/` directory.

| edition | date | looprun release | dir | aggregate (13-model cloud matrix, N=3) | anchors |
|---|---|---|---|---|---|
| **v0.6.0** | 2026-07-18 | `looprun@0.6.0` (GitHub `v0.6.0`) | [`v0.6.0/`](v0.6.0/README.md) | **governed 96.5 × ungoverned 92.6** (+3.9 pt, 11/13 per-model wins) | flash-lite (cloud subject) **100** · local-quantized (Qwen3.6-35B-A3B) **91.8** |
| **v0.6.1** | 2026-07-18 | `looprun@0.6.1` | [`v0.6.1/`](v0.6.1/README.md) | **inherited from v0.6.0** — matrix NOT re-measured | cloud subject **98.4** (its one fail is a proven subject-model knife-edge — byte-identical prompt, ~50/50 same-day re-probe; the v0.6.0 **100** stands for its edition) · local-quantized **95.6 — local record** (speculative decoding ON) |

## The versioning LAW

- **Published edition numbers are never retro-edited.** Once an edition's numbers are published they are
  frozen — corrections, re-tunes, and re-measurements do **not** overwrite them.
- **A new edition = a new `vX.Y.Z/` directory**, pinned to the looprun npm/GitHub release it was measured
  against. Nothing outside that directory changes an already-published edition's numbers.
- The headline numbers are always read from the edition's own `vX.Y.Z/` tree, never from a later edition's.
- An edition that only patches the runtime (e.g. v0.6.1) re-certifies its **anchors** and **explicitly
  inherits** any tier it did not re-measure — it never silently reuses another edition's numbers.

## Reproduce

The benchmark is **reproducible from this repo alone**. A standalone public runner lives in
[`harness/`](harness/README.md): it plays the exported subject (world + 61 cases) through both arms —
**governed** (the model driven through the public looprun runtime + guards) and **ungoverned** (the
same model in a plain Mastra agent) — then judges and scores them. It depends only on published
packages (`@looprun-ai/core`, `@looprun-ai/mastra`, `@mastra/core`, `ai`, `zod`, an AI-SDK provider)
plus the edition artifacts in these `vX.Y.Z/` directories.

```bash
pnpm install
cd benchmarks/atlas/harness
export GOOGLE_GENERATIVE_AI_API_KEY=...        # or an OpenAI-compatible endpoint — see harness/README
export MODEL_ID=gemini-3.1-flash-lite
pnpm run:governed --cases 01,07,83 --out runs/smoke     # 3-case smoke
pnpm run:governed --out runs/gov                        # full 61
pnpm judge --dir runs/gov                               # set JUDGE_MODEL_ID + a key first
pnpm score --dir runs/gov
```

See [`harness/README.md`](harness/README.md) for the full quickstart, the flag/env reference, and the
output layout. Diff your `runs/**/…verdicts.jsonl` + `…autofail.json` against the published
`vX.Y.Z/results/` to compare case by case.

## Provenance

Each edition here is a **measurement snapshot** — the subject, the specs, the ungoverned control arm,
the curated per-case verdicts, and the internal reports that produced its published numbers. The
published editions were produced **by the maintainers** on the pinned looprun release, measured with
this harness against a single held-constant LLM judge ("ruler-v2"). The artifacts plus the
[`harness/`](harness/README.md) let anyone reproduce the methodology and diff their run against the
published verdicts; a reproduction on a different judge model (or a different runtime patch level) is
informative, not a byte-for-byte match of a published figure.
