# The agentspec pipeline (how the spec is produced)

The telecom spec is produced by looprun's `agentspec` skill — the **AGENTS** pipeline — not hand-written.
The skill is installed at `.agents/skills/agentspec/` (recipes under `references/`). Run it faithfully;
the benchmark measures the skill's output.

| stage | name | what | here |
|---|---|---|---|
| **A** | ASK | one purpose question + missing-input asks | ⬜ purpose ≈ "telecom customer-support agent bound by the telecom policy" |
| **G1** | tools | tool genesis | ✅ tools already exist (τ² provides 13, in `reference/telecom/`) → skip |
| **G2** | world | synthetic world + presets + config wiring (so the spec is runnable for T) | ⬜ `references/new-subject.md` |
| **G3** | evals | generate the eval set, validated by debate | ⬜ `references/eval-generation.md` |
| **E** | ENGINEER | decompose (≤15 tools → 1 agent) + draft the spec + theme | ⬜ `references/decompose-and-draft.md` |
| **N** | NITPICK | 5 independent adversarial reviewers + verifier, ≤2 rounds → writes `REVIEW.md` | ⬜ `references/adversarial-review.md` |
| **T** | TEST | **the measured loop** — run evals vs the subject, Claude-judge, fix ≤3 rounds, certify ≥90% | ⬜ `references/measured-loop.md` |

> Everything except G1 is **⬜ to run**. An earlier hand-driven pass (not via the Skill tool) was removed
> so the domain is regenerated natively — see `roadmap.md → START HERE`.

## Why "measure, never trust"
Static drafting + adversarial review (E + N) catch a lot, but generated rulesets historically fail on
**recall** — the missed rule you only find by *running* evals. **Stage T (the measured loop) is the actual
improvement + certification step.** A spec that has passed E + N but not T is a draft, not a subject. Do not
benchmark before T certifies (`CERT.md`, N=3, ≥90%). This was a lesson learned here — see
`findings/lessons.md`.

## Note on invoking the skill
The `Skill` tool only registers skills present at session start. If you install the skill mid-session it
won't be invocable until a **fresh session opened at the repo root** picks it up (the skill lives at
`.claude/skills/agentspec`). Either way, "running the skill" means following its `references/*.md` recipes —
the N stage in particular is multi-agent (5 reviewers), orchestrated from the primary session.
