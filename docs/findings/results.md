# Results

**Status: no valid results yet.** The benchmark has not been run on the **certified** spec. This file will
hold the headline table (raw vs +looprun per subject × the four metrics + delta) once the roadmap's
G2→G3→T→benchmark path is complete. `benchmarks/tau2-telecom/results/` is empty by design.

## Throwaway runs (discarded) — kept only as diagnostics
An earlier exploratory pass ran a hand-authored, **uncertified** spec through the shim at the wrong step
budget. Those numbers are **not** the benchmark (discarded), but the diagnostics are worth keeping:

| subject | raw | +looprun | note (why NOT a valid result) |
|---|---:|---:|---|
| qwen3.5-4B @ `max_steps=30` | 50% | 30% | **config artifact** — `max_steps=30` (τ² default is **100**) hard-zeroed governed runs that were 1–6 messages over budget; 4/5 down-flips were pure budget, not governance. |
| qwen3.5-4B @ `max_steps=100` | 95% | 100% | +5pp, but N=20 near ceiling → 1 task; spec was uncertified. |
| qwen3.6-35B @ `max_steps=100` | 100% | 90% | −10pp from **spec-prose under-escalation** ("try every resolution before transferring") — a hand-author defect the later adversarial N stage would reject; no guard fired. |
| gemini-flash-lite governed | — | INVALID | infra bug: the shim's OpenAI-compat gemini path 400s on Gemini-3 multi-turn tools (missing `thought_signature`) — needs looprun's native gemini path. |

## What these taught (folded into the real methodology)
1. Use `max_steps=100` (the τ² default) — 30 was our misconfiguration.
2. Certify the spec (measured loop) **before** benchmarking — the 35B −10pp was an uncertified-spec defect.
3. The flash-lite governed arm needs looprun's **native** gemini integration, not raw OpenAI-compat `fetch`.
4. Governance may help a weak model (headroom) and hurt a strong one at ceiling — report per-subject, N,
   and the ceiling; consider a second (fabrication/honesty) axis since τ² only rewards completion.

See `../methodology.md` (fixed knobs) and `lessons.md`.
