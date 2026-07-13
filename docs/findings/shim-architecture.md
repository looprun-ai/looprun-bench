# Finding — the τ² ⇄ looprun shim architecture

## The impedance mismatch
τ²-bench **owns tool execution** (plus the user-simulator, the DB, the reward). looprun's `LoopRunAgent`
normally **owns its own loop and executes tools** via its world. Both want to own execution → you cannot
drop `LoopRunAgent.generate()` in as the τ² agent.

## The solution: an agent-LLM shim
`packages/shim` is an **OpenAI-compatible `/chat/completions` endpoint** that τ² calls once per step. Per
call it governs ONE proposed assistant turn and returns tool_calls **for τ² to execute** — it never
executes tools itself. Built on looprun's public runtime primitives (`@looprun-ai/core`): `evaluatePreTool`
(veto a proposed call without executing it), `checkReply`, `finalizeReply`, `enforcePostTool`,
`renderScopedSpecTrunk`.

Per request: reconstruct the ledger + world from the transcript → render the guard trunk into the system
prompt → call the subject once → if a tool_call, `evaluatePreTool` (veto → bounded no-tools redrive, else
pass the call through to τ²) → if a reply, `finalizeReply` (mutators → checkReply → redrive → honest-abstain).

## The four guard phases, distributed across calls
looprun has guards at **onInput / preTool / postTool / onReply**. Because τ² executes the tool *between*
two shim calls, the phases spread across successive requests:

```
   call N   : onInput → render → subject → preTool(proposed call) → return call ──► τ² EXECUTES
   call N+1 : postTool(result now in transcript) → subject → preTool(next) → …
   final    : onReply (mutators → checkReply → redrive → honest-abstain)
```
A preTool veto really blocks the tool (τ² never sees the vetoed call); postTool fires at the top of the
next call once the result is in the transcript.

## The one fidelity dependency
In production, guards read looprun's own `world`/`stateView`. In the shim there is no own world — the
`ledger` (`ObservedCall{name,args,ok,turnIndex}`) and the `TelecomWorld` state accessors are **reconstructed
from the τ² transcript** (tool-call args + prior observed calls + tool RESULTS in `tool` messages). Files:
`transcript.ts` (ledger), `world-adapter.ts` (TelecomWorld from results), `step-handler.ts` (the phase
ordering, mirrors looprun's `run-conversation.ts`), `subject-client.ts` (the subject call), `server.ts`.

## Zero looprun changes
The shim only consumes looprun's **public** API — no fork, no monkey-patch. The governance semantics are
identical to production; only the ledger's source differs (transcript vs own world).
