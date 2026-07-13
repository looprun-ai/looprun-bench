# Lessons

Process + engineering lessons from building this bench. These are load-bearing — they're in `CLAUDE.md`.

## Process
- **Certify before you benchmark.** Static drafting + adversarial review (E + N) is not enough — generated
  rulesets fail on recall. The **measured loop (T)** is the actual improvement/certification step. An
  uncertified spec is a draft, not a subject. (We benchmarked an uncertified spec and got misleading mixed
  numbers.) See `../pipeline.md`.
- **Evaluate a run before starting the next** — harvest + root-cause (especially failures) first. Launching
  the next run before understanding the last compounds confusion and wastes hours.
- **Config before conclusions.** A scary −20pp turned out to be `max_steps=30` (τ² default is 100). Check
  the knobs against the tool's defaults before attributing an effect to the thing under test.
- **Use the real tool.** Hand-rolling model serving, `file:`-linking local library source, and a raw-`fetch`
  cloud path all produced avoidable breakage. Use the published `looprun` + its CLI + its native model layer.
- **Don't over-claim.** Near-ceiling N=20 ⇒ "+5pp" is one task; a favorable variance flip is not a
  "governance win." Report N, the ceiling, and the caveats.

## Engineering
- **macOS SIP strips `DYLD_*` through `nohup`** — never launch `llama-server` via nohup. (`serving-dyld.md`)
- **Gemini-3 needs `thought_signature`** on prior functionCall parts in multi-turn tool calls — the
  OpenAI-compat endpoint via raw `fetch` doesn't carry it; use looprun's native AI-SDK gemini path.
- **Core guards stay agnostic; reply-content word-regex is multilingual-fragile** — pair any lexicon regex
  with a structural (tool-success) discriminator; never let a bare word match drive a semantic verdict.
  (`guards-agnostic-regex.md`)
- **τ² owns tool execution** — the governed arm must be an agent-LLM shim (govern one proposed turn, hand
  the call back), not `LoopRunAgent.generate()`. (`shim-architecture.md`)
- **Subagents that arm a Monitor and stop let their background runs die.** Drive long runs to completion by
  polling, or run them detached from the main session.
