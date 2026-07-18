# Overview

**looprun** is a governance layer that wraps a subject model: deterministic guards on tool calls, honest
abstention instead of fabrication, prompt-injection resistance (guards read tool args / world state / the
agent's own verified actions — never the user's text), and a Claude-judged certification.

**This repo** answers one question empirically: *does that governance help, hurt, or cost — and where?* We
measure it on **τ²-bench (telecom)**: a policy-bound tool agent talking to an LLM-simulated user over a
stateful domain, scored by a programmatic DB-state reward. That is exactly looprun's target shape.

## The four components

| component | what |
|---|---|
| **the spec** (`benchmarks/tau2-telecom/harness/telecom`) | the domain agent looprun runs — an `AgentSpec` (guards + persona + theme), **generated + validated by the `agentspec` skill**, not hand-written |
| **the bridge** (`benchmarks/tau2-telecom/harness/shim`) | τ² owns tool execution; looprun normally owns its own loop. The shim reconciles them: an OpenAI-compatible endpoint that governs ONE proposed turn per τ² step and hands tool calls back to τ² (see `findings/shim-architecture.md`) |
| **the harness** (`benchmarks/tau2-telecom/vendor/tau2-bench`) | Sierra's τ²-bench — the tasks, the user-simulator, the reward |
| **the runner** (`benchmarks/tau2-telecom/harness/runner`) | serve subject → run raw vs governed on the same tasks → harvest metrics |

## The measured comparison
Always a **pair** on identical tasks + user-simulator: `raw model` vs `same model + looprun`. The delta is
looprun's contribution — never looprun's number in isolation. See `methodology.md`.

## Why the spec must be generated + certified
The spec is not the point of study — looprun's *methodology* is. So the spec is produced the real way (the
`agentspec` skill: draft → adversarial review → measured-loop certification) before it is ever benchmarked.
Benchmarking a hand-tuned or uncertified spec would measure our authoring, not looprun. See `pipeline.md`.
