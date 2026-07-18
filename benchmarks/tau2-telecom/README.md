# tau2-telecom — governance vs the raw model on τ²-bench

**Does governance help?** This benchmark measures [**looprun**](https://looprun.ai) — a governance layer
for LLM agents — against the **raw** model, on **[τ²-bench](https://github.com/sierra-research/tau2-bench)**
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

**Target edition: `v0.6.1`** (npm `looprun@0.6.1`) — see [`docs/plan-v0.6.1.md`](docs/plan-v0.6.1.md). (The
discarded first round ran on `looprun@0.2.1`; the workspace is still installed at 0.2.1 until the bump.)

## Status

**IN PROGRESS — planning the v0.6.1 round.** A first domain WAS generated + certified on `looprun@0.2.1`
(the 0.2.x skill round, commit `3333a7b`, now under `harness/telecom/` — 48/51 = 94.1% N=3). That round is
being **discarded** in favor of a fresh regeneration on **`looprun@0.6.1`** with **OpenRouter** subjects; the
benchmark itself has not run.
**Start at [`docs/plan-v0.6.1.md`](docs/plan-v0.6.1.md)** (the current source of truth; the older
`docs/roadmap.md` "START HERE" block is superseded).

## What lives where

This benchmark is **self-contained** — its harness, vendored τ² code, docs, and results all live under
this directory:

| path | what |
|---|---|
| [`reference/`](reference/) | the τ² telecom policy + tool schemas (`main_policy.md`, `tech_support_manual.md`, `tool-schemas.json`) — source material for the spec |
| [`harness/telecom/`](harness/telecom/) | the domain-under-test — a looprun `AgentSpec` generated + adversarially validated by the `agentspec` skill |
| [`harness/shim/`](harness/shim/) | the τ² ⇄ looprun bridge: an OpenAI-compatible endpoint that governs one proposed turn per τ² step (τ² owns tool execution) |
| [`harness/runner/`](harness/runner/) | orchestration — serve the subject, run raw vs governed, harvest the four metrics |
| `vendor/tau2-bench` | the external τ² harness (vendored upstream; gitignored — `pnpm setup:tau2`) |
| [`docs/`](docs/) | the benchmark docs — `overview` · `methodology` · `pipeline` · `roadmap` · `guides/` · `findings/` |
| [`scripts/setup-tau2.sh`](scripts/setup-tau2.sh) | restore the external τ² harness into `vendor/` (pinned commit) |
| [`results/`](results/) | benchmark outputs, versioned by looprun edition (empty until the benchmark runs) |

The three `harness/*` packages are the repo's pnpm workspace (`pnpm-workspace.yaml` →
`benchmarks/tau2-telecom/harness/*`).

## Methodology & findings

- **[docs/methodology.md](docs/methodology.md)** — the paired protocol, the τ² ruler, user-simulator, `max_steps`, honest caveats.
- **[docs/pipeline.md](docs/pipeline.md)** — the `agentspec` AGENTS pipeline (A→G→E→N→T) as run here.
- **[docs/findings/](docs/findings/)** — serving/DYLD, shim architecture, guard agnosticism, adversarial review, results, lessons.
