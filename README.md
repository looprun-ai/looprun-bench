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
`results/vX.Y.Z/` directory pinned to its release. See
[`benchmarks/atlas/VERSIONS.md`](benchmarks/atlas/VERSIONS.md).

## Repo layout

| path | what |
|---|---|
| `benchmarks/atlas/` | the **atlas** governance-vs-traditional benchmark — subject, specs, control arm, curated results (versioned), docs |
| `benchmarks/tau2-telecom/` | the **τ² telecom** benchmark — front-door README, `reference/` (policy + tool schemas), `results/` |
| `packages/` | the **shared harness** (pnpm workspace): `shim` (τ² ⇄ looprun bridge), `runner` (orchestration), `telecom` (the telecom domain-under-test spec) |
| `vendor/tau2-bench` | the external τ² harness (vendored upstream; gitignored — restore with `pnpm setup:tau2`) |
| `docs/` | shared harness docs: `overview` · `methodology` · `pipeline` · `roadmap` · `guides/` · `findings/` |

## Setup

```bash
pnpm install
cp .env.example .env          # fill GOOGLE_GENERATIVE_AI_API_KEY
pnpm setup:skill              # restore the agentspec skill (pinned by skills-lock.json)
pnpm setup:tau2               # clone + uv sync the τ² harness into vendor/
```

## How this repo relates

Three repos, one flow:

1. **`neurono-bench`** — the private R&D lab: the harness where benchmarks are authored, measured, and certified.
2. **[`looprun`](https://github.com/looprun-ai/looprun)** — the public governance runtime + the `agentspec` skill.
3. **`looprun-bench`** (this repo) — the exported, reproducible benchmark editions, pinned to looprun releases.

Benchmarks are certified in the lab, run on the published runtime, and exported here as versioned editions.

Apache-2.0 © LoopRun Team
