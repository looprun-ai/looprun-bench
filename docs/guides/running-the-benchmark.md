# Guide — running the benchmark

Prereq: the spec is **certified** (`packages/telecom/CERT.md` exists — see `../roadmap.md`), `pnpm install`
done, `.env` filled, `pnpm setup:tau2` run. Load the key: `set -a; . .env; set +a`.

## 1. Serve the subject
- Local: `looprun models serve qwen3.5-4b` (or `qwen3.6-35b-a3b` — one at a time). Endpoint `:8081`.
- Cloud (flash-lite): no server; the shim/τ² call gemini directly.

## 2. Serve the governed shim
```bash
pnpm -C packages/shim serve        # OpenAI-compatible /chat/completions on :8090; calls the subject
```
Config via env: `LOOPRUN_SUBJECT_API_BASE` / `LOOPRUN_SUBJECT_MODEL` (default local llama :8081). For the
gemini subject, use looprun's native path (see the TODO in `packages/shim/src/subject-client.ts`).

## 3. Run both arms (same split + user-sim)
From `vendor/tau2-bench` (`export GEMINI_API_KEY="$GOOGLE_GENERATIVE_AI_API_KEY"; export OPENAI_API_KEY=local`):

```bash
# RAW (subject direct)
uv run tau2 run --domain telecom --agent llm_agent \
  --agent-llm "openai/<subject-served-id>" \
  --agent-llm-args '{"temperature":0,"api_base":"http://127.0.0.1:8081/v1","chat_template_kwargs":{"enable_thinking":false}}' \
  --user user_simulator --user-llm gemini/gemini-3.1-flash-lite --user-llm-args '{"temperature":0,"reasoning_effort":"none"}' \
  --task-set-name telecom --task-split-name small --num-trials 1 --max-steps 100 --max-concurrency 1 \
  --save-to raw_<subject>_small

# GOVERNED (through the shim)
uv run tau2 run --domain telecom --agent llm_agent \
  --agent-llm openai/looprun --agent-llm-args '{"api_base":"http://127.0.0.1:8090/v1"}' \
  --user user_simulator --user-llm gemini/gemini-3.1-flash-lite --user-llm-args '{"temperature":0,"reasoning_effort":"none"}' \
  --task-set-name telecom --task-split-name small --num-trials 1 --max-steps 100 --max-concurrency 1 \
  --save-to governed_<subject>_small
```

Notes: there is **no `--agent-base-url` flag** (pass `api_base` inside `--agent-llm-args`). `telecom_small`
as a task-set name hits a bug in this checkout — use `--task-set-name telecom --task-split-name small`.
Long runs must be **driven to completion by polling** (a subagent that arms a Monitor and stops will let
the run die with it).

## 4. Harvest
Read `vendor/tau2-bench/data/simulations/{raw,governed}_*/results.json` → the four metrics per arm (see
`../methodology.md`) + the shim activity JSONL. Copy the `results.json` into `benchmarks/tau2-telecom/results/` and write the table
into `../findings/results.md`. **Evaluate the result (root-cause any regression) before the next run.**
