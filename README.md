# looprun-bench

**Does governance help?** A benchmark harness that measures [**looprun**](https://looprun.ai) — a
governance layer for LLM agents — against the **raw** model, on **[τ²-bench](https://github.com/sierra-research/tau2-bench)**
(the telecom domain).

The unit of comparison is a **pair**, on the identical tasks + user-simulator:

```
        same τ² telecom tasks
               │
        ┌──────┴───────┐
        ▼              ▼
     raw model     model + looprun
        │              │
        ▼              ▼
      score A        score B      →   B − A  =  what looprun added
```

## Benchmarks

This repo hosts two governance-vs-traditional benchmarks. **looprun version used: `0.6.0`**
(npm `looprun@0.6.0`, GitHub release `v0.6.0`) for both.

- **telecom (τ²-bench).** The paired protocol above, on the τ² telecom domain (raw model vs
  model + looprun, identical tasks + user-simulator). The domain is **not yet generated** — it was
  reset to a clean state so the `agentspec` skill can be run natively (see **Status** below). Lives
  in `packages/` + `reference/telecom` + `vendor/tau2-bench`.
- **atlas** ([`atlas/`](atlas/README.md)). Governance vs traditional on **Atlas Equipment Rentals &
  Field Ops** — a 61-case, 5-agent, 54-tool business generated end-to-end from one purpose sentence by
  the `agentspec` skill. Headline: **looprun (governed) 96.5 vs traditional (ungoverned) 92.6**
  aggregate over **13 cloud models, N=3**; **100%** on the flash-lite cloud subject and a **91.8%**
  local (quantized) band. Every verdict — both arms — is scored by the same held-constant LLM judge.
  Measured on the external `neurono-bench` harness and exported here (subject + governed specs +
  ungoverned control arm + curated verdicts + reports). See [`atlas/README.md`](atlas/README.md) and
  [`atlas/docs/`](atlas/docs/).

## Structure

| path | what |
|---|---|
| `atlas/` | the **atlas** governance-vs-traditional benchmark (exported from `neurono-bench`) — subject, specs, control arm, curated results, docs |
| `packages/telecom` | the domain-under-test — a looprun `AgentSpec` generated + adversarially validated by the `agentspec` skill |
| `packages/shim` | the τ² ⇄ looprun bridge: an OpenAI-compatible endpoint that governs one proposed turn per τ² step (τ² owns tool execution) |
| `packages/runner` | orchestration — serve the subject, run raw vs governed, harvest the four metrics |
| `reference/telecom` | the τ² telecom policy + tool schemas (source material for the spec) |
| `vendor/tau2-bench` | the external harness (gitignored — `pnpm setup:tau2`) |
| `docs/` | `overview` · `methodology` · `pipeline` · `roadmap` · `guides/` · `findings/` |
| `results/` | benchmark outputs (versioned) |

## Setup

```bash
pnpm install
cp .env.example .env          # fill GOOGLE_GENERATIVE_AI_API_KEY
pnpm setup:skill              # restore the agentspec skill (pinned by skills-lock.json)
pnpm setup:tau2               # clone + uv sync the τ² harness into vendor/
```

## Status

The telecom domain is **not yet generated** — it was reset to a clean state so the `agentspec` skill can be
run **natively** (via the Skill tool, fresh session). `packages/telecom` is a placeholder contract; nothing
is certified; the benchmark has not run. **Start at [`docs/roadmap.md`](docs/roadmap.md) → "START HERE".**

## Methodology & findings

- **[docs/methodology.md](docs/methodology.md)** — the paired protocol, the τ² ruler, user-simulator, `max_steps`, honest caveats.
- **[docs/pipeline.md](docs/pipeline.md)** — the `agentspec` AGENTS pipeline (A→G→E→N→T) as run here.
- **[docs/findings/](docs/findings/)** — serving/DYLD, shim architecture, guard agnosticism, adversarial review, results, lessons.

Apache-2.0 © LoopRun Team
