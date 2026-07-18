# CLAUDE.md — looprun-bench project law

Instructions for any AI agent (or human) working in this repo. Read `docs/roadmap.md` to resume.

## What this repo is
A **benchmark harness** measuring **looprun** (a governance layer for LLM agents) against the **raw**
model, on **τ²-bench (telecom)**. The unit of comparison is a pair: *raw model* vs *same model + looprun*,
on the identical tasks + user-simulator. See `docs/overview.md` and `docs/methodology.md`.

## Hard rules
- **Firewall:** NEVER introduce the **legacy lineage token** — the codename of the pre-looprun benchmark
  project — into any tracked file. This repo is looprun-only; a drift grep for that token must stay clean.
  (The installed `agentspec` skill's own `CONTEXT.md` has a stray legacy mention, but `.agents/skills/` is
  **gitignored**, so it never enters the tree.)
- **Package manager:** **pnpm only** (`pnpm@10.33.0`, node ≥ 22). One lockfile. Never `npm install` here.
- **Use the REAL looprun** — the published `looprun` package + its CLI. Do NOT hand-roll model serving or
  `file:`-link local looprun source. Serve subjects with `looprun models serve <alias>`
  (`docs/guides/llama-serving.md`) — **never launch `llama-server` via `nohup`** (macOS SIP strips
  `DYLD_*`; use `looprun models serve`, which sets it, or `export`+`exec`).
- **Keys:** load `GOOGLE_GENERATIVE_AI_API_KEY` from `.env` (see `.env.example`). Do NOT depend on a global
  `GEMINI_API_KEY` in the shell — it can be the wrong key.
- **Evaluate before the next run:** after any benchmark/measured run, harvest + root-cause the result
  (especially failures) BEFORE launching the next one. No launch-then-diagnose-later.
- **Certify before you benchmark:** run the FULL agentspec pipeline — including the **measured loop**
  (`looprun-eval run` → judge → fix → `certify`) — before benchmarking a spec. An uncertified spec is not
  a valid subject. See `docs/pipeline.md`.

## Layout
- `packages/telecom` — the domain-under-test: the looprun AgentSpec (generated + adversarially validated
  by the `agentspec` skill). `packages/shim` — the τ²⇄looprun bridge. `packages/runner` — orchestration.
- `docs/` — `overview`, `methodology`, `pipeline`, `roadmap` + `guides/` + `findings/`.
- `benchmarks/tau2-telecom/reference/` — the τ² telecom policy + tools (source material for the spec).
- `vendor/tau2-bench/` — the external harness, gitignored; restore with `pnpm setup:tau2`.
- `.agents/skills/agentspec` + `.claude/skills/agentspec` — the installed skill (gitignored;
  restore with `pnpm setup:skill`, pinned by `skills-lock.json`).

## Setup (fresh clone)
```bash
pnpm install
cp .env.example .env   # fill GOOGLE_GENERATIVE_AI_API_KEY
pnpm setup:skill       # restore the agentspec skill (.agents/skills)
pnpm setup:tau2        # clone + uv sync the τ² harness into vendor/
```
