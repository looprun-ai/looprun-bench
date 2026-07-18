# Methodology

## The paired protocol
For each subject model, run τ²-bench telecom **twice on the identical task split + user-simulator**:
- **raw** — τ² calls the subject directly (`--agent-llm <subject>`).
- **governed** — τ² calls the subject through `@looprun-bench/shim` (`--agent-llm openai/looprun
  --agent-llm-args '{"api_base":"http://127.0.0.1:8090/v1"}'`).

The only thing that differs is looprun. **Report `governed − raw`, never a governed number alone.**

## The ruler: τ²-bench telecom
- Policy-bound tool agent + LLM user-simulator + stateful DB, scored by a programmatic DB-state reward
  with a `pass^k` reliability metric. τ²'s evaluator **hard-zeros** any run that terminates on `max_steps`
  (it doesn't even check the DB) — so the step budget matters (see below).
- One agent, 13 tools; the user's own device tools (`toggle_airplane_mode`, `check_status_bar`, …) are the
  *simulated customer's* tools (dual control), not the agent's.

## Fixed knobs (and why)
- **`max_steps = 100`** — the τ² default. A "step" is one message (agent, user, or tool result), so a
  normal support conversation is 20–40 steps; 100 is the right budget. (An early run used 30 and produced a
  −20pp artifact — see `findings/results.md`.)
- **User-simulator = `gemini-3.1-flash-lite` thinking-off**, FIXED across both arms. On a single-GPU
  machine the subject and the simulator can't both be local, so the simulator is off-device. Consequence:
  our *raw absolute* won't match Artificial Analysis's board (different simulator/config), but the
  raw→governed *delta* is valid because the simulator is identical across arms.
- **Subjects, non-thinking**: `qwen3.5-4b`, `qwen3.6-35b-a3b` (local llama.cpp, `looprun models serve`, one
  at a time), `gemini-3.1-flash-lite` (cloud, thinking-off). Non-thinking is the config looprun runs in
  production.
- **Subject pinning:** temperature 0; local qwen via `chat_template_kwargs:{enable_thinking:false}`; gemini
  via `reasoning_effort:"none"`.

## The four metrics (per arm, from `results.json`)
| metric | source | note |
|---|---|---|
| **Score %** (pass¹) | mean `reward_info.reward` | the headline; delta = looprun's lift |
| **Output tokens/task** | Σ assistant `completion_tokens` | governance adds a bit (more guard prose / redrives) |
| **Cost/task** | `agent_cost` | **$0 for local** (litellm has no price map) — label as local compute, not AA cloud $ |
| **Time/task (min)** | mean `duration` | wall-clock; governance adds redrive round-trips |

Also capture what the safety kit did — the shim's activity JSONL: vetoes / redrives / abstains / postTool
corrections.

## Honest caveats to always state
- Small N + easy split ⇒ near-ceiling scores ⇒ a "+N pp" can be a single task. Report N and the ceiling.
- Local cost/time are OUR hardware, not AA's cloud figures.
- τ² rewards **task completion**, not honest abstention — looprun's honest "I can't safely do that" scores
  zero here even when it's the *safer* behavior. Consider a second axis (fabrication rate) if score alone
  undersells governance.
