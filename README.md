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

## Structure

| path | what |
|---|---|
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
