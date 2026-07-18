> **Provenance:** an internal research report, reproduced here as part of this benchmark edition.
> Vocabulary: *governed* / *looprun* = the looprun runtime (`@looprun-ai/core` 0.6.0); *vanilla* = the
> ungoverned control arm; "the Claude/Opus judge (D9, ruler-v2)" = the LLM judge used for every verdict
> in this benchmark (both arms, same judge). Decision labels (D9/D24/D25...) are edition-internal.

# Tool-result history compaction — A/B verdict: ROLLBACK (2026-07-17)

**Question (the biggest remaining token lever):** the governed micro-loop re-sends prior turns'
tool-results in the message history each step; big list results (`listAssets`/`listBookings`) were
suspected to inflate multi-turn cases. Would compacting them cut tokens without hurting quality?

**Approach tested (user's choice):** Mastra-native. `ToolCallFilter` lives in
`@mastra/core/processors` (v1) as an **`inputProcessor`** — decoupled from the `Memory` abstraction —
and the governed loop already passes `inputProcessors` to `agent.generate(...)`, so it plugged in
surgically (no loop rewrite). Gated by an internal compaction flag; OFF ⇒ byte-identical
(proof suite 259/259 + invariants 202/202). `ToolCallFilter.processInput` runs once at each turn's
start (before this turn produces results) so it only ever drops **prior-turn** results;
`exclude` = the agent's domain surface (keeps prior `replyToUser`/`askUser` text).

**Measured — atlas (`BENCH_EXAMPLE=atlas`, bundle atlas-r2), full 61, `gemini-3.1-flash-lite-thinkoff`, reps=1:**

| slice | baseline input tok | compacted | Δ |
|---|---|---|---|
| overall (61) | 948,055 | 915,733 | −3.4% *(noise, not real)* |
| **multi-turn (15)** — where the lever acts | 359,827 | 368,514 | **+2.4% WORSE** |
| single-turn (46) — flag can't touch these | 588,228 | 547,219 | −7.0% *(= noise floor)* |

Pass gate (deterministic invariant): **0 autofails both arms — no quality regression.**

**Why it doesn't pay (root cause):**
1. The **−3.4% overall is measurement noise**, not saving: single-turn cases (which the flag cannot
   affect) moved −7.0% purely from FL's run-to-run non-determinism at temp-0. The noise floor dwarfs
   the lever.
2. On atlas the premise is false: tool results are **small single records (~50–200 tok)**, not big
   lists (largest across all 61 = `listAssets` ~200 tok). So the genuine lever on the 15 multi-turn
   cases is tiny (~1–2.7%).
3. **Re-fetch penalty:** dropping a prior result made the model **re-call the tool** (cases 28/87/06,
   +15–20%) — an extra micro-step re-sends the ~5k static trunk. Net multi-turn = **+2.4% worse**.
4. Deeper reason: the **static system trunk dominates every micro-step's input**; prior tool-results
   are a small slice, so compacting them saves little and risks an induced re-fetch that costs a whole
   trunk-sized step.

**Verdict: ROLLBACK.** "Tokens down AND pass-rate not worse" is not met (pass-rate ok; tokens not
reliably down — multi-turn is worse, overall is inside a ±7% non-determinism band). Branch
`exp/toolresult-compaction` discarded. **Revisit only** for a subject with genuinely large list
results AND a model that doesn't re-fetch — and then with `preserveModelOutput: true` (leave a compact
result stub so the model doesn't re-call). Telegraphic / schema-camada-3 share the same
trunk-dominated, small-payoff-vs-risk profile and were not pursued.
