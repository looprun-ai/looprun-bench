/**
 * @looprun-bench/runner — benchmark orchestration (skeleton).
 *
 * The measured comparison, formalized (see docs/guides/running-the-benchmark.md and
 * docs/roadmap.md). Planned surface (built when the pipeline resumes — G2/G3/T then benchmark):
 *
 *   serve()   — start the local subject via `looprun models serve <alias>` (llama.cpp; DYLD handled
 *               by looprun) OR configure the cloud subject (gemini-flash-lite, thinking-off).
 *   run()     — `tau2 run --domain telecom` twice on the SAME task split + user-simulator:
 *               raw (subject direct) vs governed (via @looprun-bench/shim), max_steps=100.
 *   harvest() — read the two results.json and emit the four metrics (pass^k score, output
 *               tokens/task, cost/task, time/task) + the looprun activity summary → a table.
 *
 * Kept intentionally empty until the certified spec exists — we do not benchmark an uncertified spec.
 */
export const RUNNER_TODO = 'see docs/roadmap.md — build after the telecom spec is certified (T stage)';
