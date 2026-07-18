# looprun-bench

**The benchmarks of [looprun](https://looprun.ai) — does governance help, measured.** Each benchmark
pairs the *same* model, on the *same* tasks + judge, in two arms — **raw model** vs **model + looprun
governance** — so the delta is exactly what the governance layer added.

## Benchmarks

| Benchmark | Question | Scale | Status | Headline | Dir |
|---|---|---|---|---|---|
| **atlas** | Does governance help across cloud models + a local band? | 5 agents · 61 cases · 54 tools · 13 cloud models N=3 | **LIVE** | **governed 96.5 × ungoverned 92.6** (anchors: flash-lite 100 · local-quantized 91.8) | [`benchmarks/atlas/`](benchmarks/atlas/README.md) |
| **tau2-telecom** | Raw model vs model + looprun on the τ² telecom domain | τ² telecom tasks + user-simulator | **IN PROGRESS** — domain reset for native skill generation | — | [`benchmarks/tau2-telecom/`](benchmarks/tau2-telecom/README.md) |

Every verdict — both arms, every benchmark — is scored by the same held-constant LLM judge. Never mix
rulers; never compare numbers across benchmarks.

## Versioning

Benchmark results ship as **editions** pinned to a published **looprun release** (npm `looprun@X.Y.Z` +
the matching GitHub tag). Published edition numbers are never retro-edited — a new edition is a new
self-contained `vX.Y.Z/` directory pinned to its release. The edition index + the versioning LAW live
in each benchmark's README, e.g. [`benchmarks/atlas/README.md`](benchmarks/atlas/README.md).

## Repo layout

Each benchmark is **self-contained** under `benchmarks/<name>/` — it owns its subject, its harness, its
docs, and its versioned result editions. There is no shared top-level `packages/`, `vendor/`, or `docs/`.

| path | what |
|---|---|
| `benchmarks/atlas/` | the **atlas** governance-vs-traditional benchmark — thin index README (editions + LAW) over **standalone** editions `v0.6.0/` and `v0.6.1/`, each its own npm package (`cd` in + install; not in the root workspace) with a **frozen copy of the harness** (`vX.Y.Z/harness/`), exact-pinned `package.json` + lockfile, subject, specs, control arm, curated results, docs |
| `benchmarks/tau2-telecom/` | the **τ² telecom** benchmark — front-door README + `reference/` (policy + tool schemas), `harness/` (the pnpm-workspace packages `shim`/`runner`/`telecom`), `vendor/tau2-bench` (external τ² harness, gitignored — `pnpm setup:tau2`), `docs/` (overview · methodology · pipeline · roadmap · guides/ · findings/), `scripts/`, `results/` |

## Setup

```bash
pnpm install
cp .env.example .env          # fill GOOGLE_GENERATIVE_AI_API_KEY
pnpm setup:skill              # restore the agentspec skill (pinned by skills-lock.json)
pnpm setup:tau2               # clone + uv sync the τ² harness into benchmarks/tau2-telecom/vendor/
```

## How this repo relates

Two repos, one flow:

1. **[`looprun`](https://github.com/looprun-ai/looprun)** — the public governance runtime + the `agentspec` skill.
2. **`looprun-bench`** (this repo) — the reproducible benchmark editions, pinned to looprun releases.

Each benchmark subject is authored and certified with the `agentspec` skill, run on the published
runtime, and shipped here as self-contained versioned editions.

Apache-2.0 © LoopRun Team
